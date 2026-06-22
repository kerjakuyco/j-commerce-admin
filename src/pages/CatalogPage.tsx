import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, PackagePlus, Tags } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { request } from "../lib/api";
import { assetUrlMessage, isAssetUrl, normalizeAssetUrl } from "../lib/asset-url";
import { money, readError, slugify } from "../lib/format";
import type {
  Category,
  Paginated,
  Product,
  ProductImage,
  ProductVariant,
} from "../types";

const optionalNumber = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().optional(),
);
const requiredNumber = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number(),
);
const requiredInt = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int(),
);
const assetUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isAssetUrl, { message: assetUrlMessage });
const optionalAssetUrlSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isAssetUrl(value), {
    message: assetUrlMessage,
  });

const productSchema = z.object({
  name: z.string().min(3),
  slug: z.string().optional(),
  brand: z.string().min(2),
  description: z.string().min(12),
  categoryId: z.string().min(1),
  basePrice: requiredNumber.pipe(z.number().min(0)),
  discountPrice: optionalNumber,
  imageUrl: optionalAssetUrlSchema,
});

const variantSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(2),
  price: requiredInt.pipe(z.number().int().min(0)),
  stock: requiredInt.pipe(z.number().int().min(0)),
});

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: requiredInt.pipe(z.number().int().min(0)),
});

const imageSchema = z.object({
  productId: z.string().min(1),
  url: assetUrlSchema,
});

type ProductFormInput = z.input<typeof productSchema>;
type ProductForm = z.output<typeof productSchema>;
type VariantFormInput = z.input<typeof variantSchema>;
type VariantForm = z.output<typeof variantSchema>;
type CategoryFormInput = z.input<typeof categorySchema>;
type CategoryForm = z.output<typeof categorySchema>;
type ImageFormInput = z.input<typeof imageSchema>;
type ImageForm = z.output<typeof imageSchema>;

export function CatalogPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: ({ signal }) =>
      request<Paginated<Product>>("/products?limit=80", { token, signal }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      request<Category[]>("/categories", { token, signal }),
  });

  const productForm = useForm<ProductFormInput, unknown, ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
      brand: "",
      description: "",
      categoryId: "",
      basePrice: 0,
      discountPrice: "",
      imageUrl: "",
    },
  });
  const variantForm = useForm<VariantFormInput, unknown, VariantForm>({
    resolver: zodResolver(variantSchema),
    defaultValues: { productId: "", name: "", sku: "", price: 0, stock: 0 },
  });
  const categoryForm = useForm<CategoryFormInput, unknown, CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", icon: "", sortOrder: 0 },
  });

  const invalidateCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
    ]);
  };

  const createProduct = useMutation({
    mutationFn: (values: ProductForm) =>
      request<Product>("/products", {
        token,
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          slug: values.slug || slugify(values.name),
          brand: values.brand,
          description: values.description,
          categoryId: values.categoryId,
          basePrice: values.basePrice,
          discountPrice: values.discountPrice,
          images: values.imageUrl
            ? [{ url: normalizeAssetUrl(values.imageUrl), sortOrder: 0 }]
            : [],
        }),
      }),
    onSuccess: async () => {
      productForm.reset();
      await invalidateCatalog();
      toast.success("Product created");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const createVariant = useMutation({
    mutationFn: (values: VariantForm) =>
      request<ProductVariant>(`/products/${values.productId}/variants`, {
        token,
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          sku: values.sku,
          price: values.price,
          stock: values.stock,
        }),
      }),
    onSuccess: async () => {
      variantForm.reset();
      await invalidateCatalog();
      toast.success("Variant added");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const createCategory = useMutation({
    mutationFn: (values: CategoryForm) =>
      request<Category>("/categories", {
        token,
        method: "POST",
        body: JSON.stringify({
          ...values,
          slug: values.slug || slugify(values.name),
        }),
      }),
    onSuccess: async () => {
      categoryForm.reset({ name: "", slug: "", icon: "", sortOrder: 0 });
      await invalidateCatalog();
      toast.success("Category created");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const deleteProduct = useMutation({
    // Soft-delete: the storefront hides the product but existing orders keep
    // their snapshots intact.
    mutationFn: (id: string) =>
      request<{ message: string }>(`/products/${id}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: async () => {
      await invalidateCatalog();
      toast.success("Product removed");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const addImage = useMutation({
    mutationFn: ({ productId, url }: { productId: string; url: string }) =>
      request<ProductImage>(`/products/${productId}/images`, {
        token,
        method: "POST",
        body: JSON.stringify({ url: normalizeAssetUrl(url) }),
      }),
    onSuccess: async () => {
      await invalidateCatalog();
      toast.success("Image attached");
    },
    onError: (error) => toast.error(readError(error)),
  });

  if (productsQuery.isLoading || categoriesQuery.isLoading)
    return <LoadingState />;
  if (productsQuery.error)
    return <ErrorState message={readError(productsQuery.error)} />;
  if (categoriesQuery.error)
    return <ErrorState message={readError(categoriesQuery.error)} />;

  const products = productsQuery.data?.data ?? [];
  const categories = categoriesQuery.data ?? [];

  return (
    <div className="catalog-layout">
      <Panel
        title="Product catalog"
        eyebrow={`${products.length} SKUs`}
        className="span-2"
      >
        <DataTable
          caption="Product catalog table"
          columns={[
            "Product",
            "Brand",
            "Category",
            "Price",
            "Rating",
            "Variants",
            "Action",
          ]}
          keyExtractor={(_row, index) => products[index]?.id ?? index}
          rows={products.map((product) => [
            product.name,
            product.brand,
            product.category?.name ?? "-",
            money(product.discountPrice ?? product.basePrice),
            <Badge tone="hot">{product.rating.toFixed(1)}</Badge>,
            product._count?.variants ?? product.variants?.length ?? 0,
            <button
              className="table-button"
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Remove product "${product.name}"? It will be hidden from the storefront but existing orders remain unaffected.`,
                  )
                ) {
                  deleteProduct.mutate(product.id);
                }
              }}
            >
              Delete
            </button>,
          ])}
        />
      </Panel>
      <Panel title="Create product" eyebrow="product details">
        <form
          className="control-form"
          onSubmit={productForm.handleSubmit((values) =>
            createProduct.mutate(values),
          )}
        >
          <label htmlFor="product-name">
            Name
            <input
              id="product-name"
              {...productForm.register("name")}
              placeholder="Product name"
            />
            {productForm.formState.errors.name && (
              <span className="field-error">
                {productForm.formState.errors.name.message}
              </span>
            )}
          </label>
          <label htmlFor="product-slug">
            Slug
            <input
              id="product-slug"
              {...productForm.register("slug")}
              placeholder="Slug (auto if empty)"
            />
            {productForm.formState.errors.slug && (
              <span className="field-error">
                {productForm.formState.errors.slug.message}
              </span>
            )}
          </label>
          <label htmlFor="product-brand">
            Brand
            <input
              id="product-brand"
              {...productForm.register("brand")}
              placeholder="Brand"
            />
            {productForm.formState.errors.brand && (
              <span className="field-error">
                {productForm.formState.errors.brand.message}
              </span>
            )}
          </label>
          <label htmlFor="product-category">
            Category
            <select
              id="product-category"
              {...productForm.register("categoryId")}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {productForm.formState.errors.categoryId && (
              <span className="field-error">
                {productForm.formState.errors.categoryId.message}
              </span>
            )}
          </label>
          <label htmlFor="product-basePrice">
            Base price
            <input
              id="product-basePrice"
              {...productForm.register("basePrice")}
              type="number"
              placeholder="Base price"
            />
            {productForm.formState.errors.basePrice && (
              <span className="field-error">
                {productForm.formState.errors.basePrice.message}
              </span>
            )}
          </label>
          <label htmlFor="product-discountPrice">
            Discount price
            <input
              id="product-discountPrice"
              {...productForm.register("discountPrice")}
              type="number"
              placeholder="Discount price"
            />
            {productForm.formState.errors.discountPrice && (
              <span className="field-error">
                {productForm.formState.errors.discountPrice.message}
              </span>
            )}
          </label>
          <label htmlFor="product-imageUrl">
            Image URL
            <input
              id="product-imageUrl"
              {...productForm.register("imageUrl")}
              placeholder="Image URL"
            />
            {productForm.formState.errors.imageUrl && (
              <span className="field-error">
                {productForm.formState.errors.imageUrl.message}
              </span>
            )}
          </label>
          <label htmlFor="product-description">
            Description
            <textarea
              id="product-description"
              {...productForm.register("description")}
              placeholder="Description"
            />
            {productForm.formState.errors.description && (
              <span className="field-error">
                {productForm.formState.errors.description.message}
              </span>
            )}
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={createProduct.isPending}
          >
            <PackagePlus size={17} /> Create
          </button>
        </form>
      </Panel>
      <Panel title="Variant and image" eyebrow="inventory">
        <form
          className="control-form"
          onSubmit={variantForm.handleSubmit((values) =>
            createVariant.mutate(values),
          )}
        >
          <label htmlFor="variant-productId">
            Product
            <select
              id="variant-productId"
              {...variantForm.register("productId")}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {variantForm.formState.errors.productId && (
              <span className="field-error">
                {variantForm.formState.errors.productId.message}
              </span>
            )}
          </label>
          <label htmlFor="variant-name">
            Variant name
            <input
              id="variant-name"
              {...variantForm.register("name")}
              placeholder="Variant name"
            />
            {variantForm.formState.errors.name && (
              <span className="field-error">
                {variantForm.formState.errors.name.message}
              </span>
            )}
          </label>
          <label htmlFor="variant-sku">
            SKU
            <input
              id="variant-sku"
              {...variantForm.register("sku")}
              placeholder="SKU"
            />
            {variantForm.formState.errors.sku && (
              <span className="field-error">
                {variantForm.formState.errors.sku.message}
              </span>
            )}
          </label>
          <label htmlFor="variant-price">
            Price
            <input
              id="variant-price"
              {...variantForm.register("price")}
              type="number"
              step="1"
              placeholder="Price"
            />
            {variantForm.formState.errors.price && (
              <span className="field-error">
                {variantForm.formState.errors.price.message}
              </span>
            )}
          </label>
          <label htmlFor="variant-stock">
            Stock
            <input
              id="variant-stock"
              {...variantForm.register("stock")}
              type="number"
              step="1"
              placeholder="Stock"
            />
            {variantForm.formState.errors.stock && (
              <span className="field-error">
                {variantForm.formState.errors.stock.message}
              </span>
            )}
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={createVariant.isPending}
          >
            <Tags size={17} /> Add variant
          </button>
        </form>
        <ImageAttachForm
          products={products}
          isPending={addImage.isPending}
          onAdd={(productId, url) => addImage.mutateAsync({ productId, url })}
        />
      </Panel>
      <Panel title="Create category" eyebrow="organization">
        <form
          className="control-form"
          onSubmit={categoryForm.handleSubmit((values) =>
            createCategory.mutate(values),
          )}
        >
          <label htmlFor="category-name">
            Category name
            <input
              id="category-name"
              {...categoryForm.register("name")}
              placeholder="Category name"
            />
            {categoryForm.formState.errors.name && (
              <span className="field-error">
                {categoryForm.formState.errors.name.message}
              </span>
            )}
          </label>
          <label htmlFor="category-slug">
            Slug
            <input
              id="category-slug"
              {...categoryForm.register("slug")}
              placeholder="Slug"
            />
            {categoryForm.formState.errors.slug && (
              <span className="field-error">
                {categoryForm.formState.errors.slug.message}
              </span>
            )}
          </label>
          <label htmlFor="category-icon">
            Icon
            <input
              id="category-icon"
              {...categoryForm.register("icon")}
              placeholder="Icon"
            />
            {categoryForm.formState.errors.icon && (
              <span className="field-error">
                {categoryForm.formState.errors.icon.message}
              </span>
            )}
          </label>
          <label htmlFor="category-sortOrder">
            Sort order
            <input
              id="category-sortOrder"
              {...categoryForm.register("sortOrder")}
              type="number"
              step="1"
              placeholder="Sort order"
            />
            {categoryForm.formState.errors.sortOrder && (
              <span className="field-error">
                {categoryForm.formState.errors.sortOrder.message}
              </span>
            )}
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={createCategory.isPending}
          >
            <Tags size={17} /> Create category
          </button>
        </form>
      </Panel>
    </div>
  );
}

function ImageAttachForm({
  products,
  isPending,
  onAdd,
}: {
  products: Product[];
  isPending: boolean;
  onAdd: (productId: string, url: string) => Promise<ProductImage | undefined>;
}) {
  const form = useForm<ImageFormInput, unknown, ImageForm>({
    resolver: zodResolver(imageSchema),
    defaultValues: { productId: "", url: "" },
  });
  return (
    <form
      className="control-form minor-form"
      onSubmit={form.handleSubmit(
        async (values) => {
          try {
            await onAdd(values.productId, values.url);
            form.reset({ productId: "", url: "" });
          } catch {
            // Mutation onError already surfaces the API message.
          }
        },
        () => toast.error("Select a product and enter a valid image URL"),
      )}
    >
      <label htmlFor="image-productId">
        Image target
        <select id="image-productId" {...form.register("productId")}>
          <option value="">Image target</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        {form.formState.errors.productId && (
          <span className="field-error">
            {form.formState.errors.productId.message}
          </span>
        )}
      </label>
      <label htmlFor="image-url">
        Image URL
        <input
          id="image-url"
          {...form.register("url")}
          placeholder="Image URL"
        />
        {form.formState.errors.url && (
          <span className="field-error">
            {form.formState.errors.url.message}
          </span>
        )}
      </label>
      <button className="ghost-button" type="submit" disabled={isPending}>
        <ImagePlus size={16} /> Attach image
      </button>
    </form>
  );
}
