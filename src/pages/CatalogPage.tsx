import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  PackagePlus,
  Pencil,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
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
  isFeatured: z.boolean(),
  isFlashSale: z.boolean(),
  flashSaleEndsAt: z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
      message: "Enter a valid flash sale end time",
    }),
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

const emptyProductForm: ProductFormInput = {
  name: "",
  slug: "",
  brand: "",
  description: "",
  categoryId: "",
  basePrice: 0,
  discountPrice: "",
  imageUrl: "",
  isFeatured: false,
  isFlashSale: false,
  flashSaleEndsAt: "",
};
const catalogSorts = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price low" },
  { value: "price_desc", label: "Price high" },
  { value: "rating", label: "Top rated" },
  { value: "sold", label: "Best sold" },
] as const;
type CatalogSort = (typeof catalogSorts)[number]["value"];

export function CatalogPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get("search") ?? "";
  const categoryFromUrl = searchParams.get("categoryId") ?? "";
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const catalogSearch = searchFromUrl;
  const catalogCategoryId = categoryFromUrl;
  const [catalogSort, setCatalogSort] = useState<CatalogSort>("newest");
  const setCatalogParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };
  const productQuery = new URLSearchParams({ limit: "80", sort: catalogSort });
  if (catalogSearch.trim()) productQuery.set("search", catalogSearch.trim());
  if (catalogCategoryId) productQuery.set("categoryId", catalogCategoryId);
  const productsQuery = useQuery({
    queryKey: ["products", catalogSearch.trim(), catalogCategoryId, catalogSort],
    queryFn: ({ signal }) =>
      request<Paginated<Product>>(`/products?${productQuery.toString()}`, {
        token,
        signal,
      }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      request<Category[]>("/categories", { token, signal }),
  });
  const editingProductId = editingProduct?.id;
  const productDetailQuery = useQuery({
    queryKey: ["products", "detail", editingProductId],
    enabled: Boolean(editingProductId),
    queryFn: ({ signal }) =>
      request<Product>(`/products/${editingProductId}`, { token, signal }),
  });

  const productForm = useForm<ProductFormInput, unknown, ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductForm,
  });
  const productImagePreview = useWatch({
    control: productForm.control,
    name: "imageUrl",
  });
  const variantForm = useForm<VariantFormInput, unknown, VariantForm>({
    resolver: zodResolver(variantSchema),
    defaultValues: { productId: "", name: "", sku: "", price: 0, stock: 0 },
  });
  const categoryForm = useForm<CategoryFormInput, unknown, CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", icon: "", sortOrder: 0 },
  });

  const invalidateCatalog = async (productId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      productId
        ? queryClient.invalidateQueries({ queryKey: ["products", "detail", productId] })
        : Promise.resolve(),
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
          isFeatured: values.isFeatured,
          isFlashSale: values.isFlashSale,
          flashSaleEndsAt: values.isFlashSale
            ? toIsoDateTime(values.flashSaleEndsAt) ?? nextFlashSaleEnd()
            : undefined,
          images: values.imageUrl
            ? [{ url: normalizeAssetUrl(values.imageUrl), sortOrder: 0 }]
            : [],
        }),
    }),
    onSuccess: async () => {
      setEditingProduct(null);
      productForm.reset(emptyProductForm);
      await invalidateCatalog();
      toast.success("Product created");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ProductForm }) => {
      const imageUrl = values.imageUrl.trim();
      const updated = await request<Product>(`/products/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({
          name: values.name,
          slug: values.slug || slugify(values.name),
          brand: values.brand,
          description: values.description,
          categoryId: values.categoryId,
          basePrice: values.basePrice,
          discountPrice: values.discountPrice ?? null,
          isFeatured: values.isFeatured,
          isFlashSale: values.isFlashSale,
          flashSaleEndsAt: values.isFlashSale
            ? toIsoDateTime(values.flashSaleEndsAt) ?? nextFlashSaleEnd()
            : null,
        }),
      });

      if (imageUrl && normalizeAssetUrl(imageUrl) !== primaryProductImage(editingProduct)) {
        await request<ProductImage>(`/products/${id}/images`, {
          token,
          method: "POST",
          body: JSON.stringify({ url: normalizeAssetUrl(imageUrl) }),
        });
      }

      return updated;
    },
    onSuccess: async (_product, variables) => {
      setEditingProduct(null);
      productForm.reset(emptyProductForm);
      await invalidateCatalog(variables.id);
      toast.success("Product updated");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const updateMerchandising = useMutation({
    mutationFn: ({
      id,
      ...values
    }: {
      id: string;
      isFeatured?: boolean;
      isFlashSale?: boolean;
      flashSaleEndsAt?: string | null;
    }) =>
      request<Product>(`/products/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await invalidateCatalog();
      toast.success("Merchandising updated");
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
    onSuccess: async (_image, variables) => {
      await invalidateCatalog(variables.productId);
      toast.success("Image attached");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const deleteImage = useMutation({
    mutationFn: ({ id }: { productId: string; id: string }) =>
      request<{ message: string }>(`/images/${id}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: async (_result, variables) => {
      await invalidateCatalog(variables.productId);
      toast.success("Image removed");
    },
    onError: (error) => toast.error(readError(error)),
  });

  const reorderImages = useMutation({
    mutationFn: ({
      productId,
      images,
    }: {
      productId: string;
      images: { id: string; sortOrder: number }[];
    }) =>
      request<ProductImage[]>(`/products/${productId}/images/reorder`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ images }),
      }),
    onSuccess: async (_result, variables) => {
      await invalidateCatalog(variables.productId);
      toast.success("Image order updated");
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
  const imageProduct = productDetailQuery.data ?? editingProduct;
  const savingProduct = createProduct.isPending || updateProduct.isPending;
  const startEditingProduct = (product: Product) => {
    setEditingProduct(product);
    productForm.reset(productToForm(product));
    document
      .getElementById("catalog-product-form")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const cancelEditingProduct = () => {
    setEditingProduct(null);
    productForm.reset(emptyProductForm);
  };

  return (
    <div className="catalog-layout">
      <Panel
        title="Product catalog"
        eyebrow={`${products.length} SKUs`}
        className="catalog-table-panel"
      >
        <div className="catalog-toolbar" aria-label="Catalog filters">
          <label htmlFor="catalog-search">
            Search
            <input
              id="catalog-search"
              value={catalogSearch}
              onChange={(event) => setCatalogParam("search", event.target.value)}
              placeholder="Name, brand, description"
              type="search"
            />
          </label>
          <label htmlFor="catalog-category-filter">
            Category
            <select
              id="catalog-category-filter"
              value={catalogCategoryId}
              onChange={(event) => setCatalogParam("categoryId", event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="catalog-sort">
            Sort
            <select
              id="catalog-sort"
              value={catalogSort}
              onChange={(event) => setCatalogSort(event.target.value as CatalogSort)}
            >
              {catalogSorts.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setSearchParams(new URLSearchParams());
              setCatalogSort("newest");
            }}
          >
            Reset
          </button>
        </div>
        <DataTable
          caption="Product catalog table"
          columns={[
            "Product",
            "Brand",
            "Category",
            "Price",
            "Rating",
            "Variants",
            "Stock",
            "Merchandising",
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
            <StockCell product={product} />,
            <ProductMerchandisingCell
              product={product}
              disabled={updateMerchandising.isPending}
              onUpdate={(values) =>
                updateMerchandising.mutate({ id: product.id, ...values })
              }
            />,
            <div className="table-actions">
              <button
                className="icon-button"
                type="button"
                aria-label={`Edit ${product.name}`}
                title="Edit"
                onClick={() => startEditingProduct(product)}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button icon-button-danger"
                type="button"
                aria-label={`Delete ${product.name}`}
                title="Delete"
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
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>,
          ])}
        />
      </Panel>
      <Panel
        title={editingProduct ? "Edit product" : "Create product"}
        eyebrow={editingProduct ? editingProduct.name : "product details"}
        className="catalog-product-panel"
      >
        <form
          id="catalog-product-form"
          className="control-form product-form-grid"
          onSubmit={productForm.handleSubmit((values) =>
            editingProduct
              ? updateProduct.mutate({ id: editingProduct.id, values })
              : createProduct.mutate(values),
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
          <label className="field-wide" htmlFor="product-imageUrl">
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
            <AssetPreview value={productImagePreview} label="Product image preview" />
          </label>
          <div className="merch-form-panel field-wide">
            <div className="merch-form-heading">
              <strong>Home sections</strong>
              <span>Choose where this product appears.</span>
            </div>
            <div className="check-grid" aria-label="Merchandising flags">
              <label className="check-row" htmlFor="product-isFeatured">
                <input
                  id="product-isFeatured"
                  type="checkbox"
                  {...productForm.register("isFeatured")}
                />
                <span>
                  <strong>Featured</strong>
                  <small>Produk Pilihan section.</small>
                </span>
              </label>
              <label className="check-row" htmlFor="product-isFlashSale">
                <input
                  id="product-isFlashSale"
                  type="checkbox"
                  {...productForm.register("isFlashSale")}
                />
                <span>
                  <strong>Flash sale</strong>
                  <small>Timed promo section.</small>
                </span>
              </label>
            </div>
            <label className="merch-form-date" htmlFor="product-flashSaleEndsAt">
              Flash sale ends
              <input
                id="product-flashSaleEndsAt"
                {...productForm.register("flashSaleEndsAt")}
                type="datetime-local"
              />
              <span className="field-hint">
                Optional. Quick actions use a 7-day window.
              </span>
              {productForm.formState.errors.flashSaleEndsAt && (
                <span className="field-error">
                  {productForm.formState.errors.flashSaleEndsAt.message}
                </span>
              )}
            </label>
          </div>
          <label className="field-wide" htmlFor="product-description">
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
          <div className="form-actions form-submit">
            <button
              className="primary-button"
              type="submit"
              disabled={savingProduct}
            >
              <PackagePlus size={17} /> {editingProduct ? "Update" : "Create"}
            </button>
            {editingProduct && (
              <button
                className="ghost-button"
                type="button"
                disabled={savingProduct}
                onClick={cancelEditingProduct}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
        {editingProduct && (
          <ProductImageGallery
            product={imageProduct}
            loading={productDetailQuery.isLoading}
            deletingImageId={deleteImage.variables?.id}
            disabled={deleteImage.isPending || reorderImages.isPending}
            onDelete={(productId, imageId) =>
              deleteImage.mutate({ productId, id: imageId })
            }
            onReorder={(productId, images) =>
              reorderImages.mutate({ productId, images })
            }
          />
        )}
      </Panel>
      <div className="catalog-side-stack">
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
    </div>
  );
}

function ProductImageGallery({
  product,
  loading,
  disabled,
  deletingImageId,
  onDelete,
  onReorder,
}: {
  product: Product | null;
  loading: boolean;
  disabled: boolean;
  deletingImageId?: string;
  onDelete: (productId: string, imageId: string) => void;
  onReorder: (productId: string, images: { id: string; sortOrder: number }[]) => void;
}) {
  if (loading) {
    return <p className="image-gallery-empty">Loading product images…</p>;
  }
  if (!product) return null;

  const images = [...(product.images ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const applyOrder = (nextImages: ProductImage[]) => {
    onReorder(
      product.id,
      nextImages.map((image, index) => ({ id: image.id, sortOrder: index })),
    );
  };
  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const next = [...images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    applyOrder(next);
  };

  return (
    <section className="product-image-gallery" aria-label="Product image gallery">
      <div className="product-image-gallery-heading">
        <strong>Image gallery</strong>
        <span>First image is used as the storefront primary image.</span>
      </div>
      {images.length === 0 ? (
        <p className="image-gallery-empty">No images attached yet.</p>
      ) : (
        <div className="image-gallery-list">
          {images.map((image, index) => (
            <article key={image.id} className="image-gallery-card">
              <img src={normalizeAssetUrl(image.url)} alt="" loading="lazy" />
              <div>
                <strong>{index === 0 ? "Primary image" : `Image ${index + 1}`}</strong>
                <span title={image.url}>{image.url}</span>
              </div>
              <div className="image-gallery-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Set image as primary"
                  title="Set primary"
                  disabled={disabled || index === 0}
                  onClick={() => applyOrder([image, ...images.filter((item) => item.id !== image.id)])}
                >
                  <Star size={16} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Move image up"
                  title="Move up"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Move image down"
                  title="Move down"
                  disabled={disabled || index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  className="icon-button icon-button-danger"
                  type="button"
                  aria-label="Delete image"
                  title="Delete image"
                  disabled={disabled || deletingImageId === image.id}
                  onClick={() => {
                    if (window.confirm("Delete this product image?")) {
                      onDelete(product.id, image.id);
                    }
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ProductMerchandisingCell({
  product,
  disabled,
  onUpdate,
}: {
  product: Product;
  disabled: boolean;
  onUpdate: (values: {
    isFeatured?: boolean;
    isFlashSale?: boolean;
    flashSaleEndsAt?: string | null;
  }) => void;
}) {
  const flashActive = isFlashSaleActive(product);
  const flashExpired = product.isFlashSale && !flashActive;
  const flashStatus = !product.isFlashSale
    ? "Off"
    : flashExpired
      ? "Expired"
      : "Live";
  const flashTone = !product.isFlashSale
    ? "neutral"
    : flashExpired
      ? "danger"
      : "warn";
  const flashDetail = product.isFlashSale
    ? `${flashExpired ? "Expired" : "Ends"} ${formatFlashSaleEnd(product.flashSaleEndsAt)}`
    : "Start a 7-day flash window";
  const flashActionLabel = product.isFlashSale
    ? flashExpired
      ? "Renew 7d"
      : "End"
    : "Start 7d";

  return (
    <div className="merch-cell">
      <div className="merch-row">
        <span className="merch-state">
          <strong>Featured</strong>
          <Badge tone={product.isFeatured ? "hot" : "neutral"}>
            {product.isFeatured ? "On" : "Off"}
          </Badge>
        </span>
        <button
          className="table-button merch-action-button"
          type="button"
          disabled={disabled}
          onClick={() => onUpdate({ isFeatured: !product.isFeatured })}
        >
          {product.isFeatured ? "Hide" : "Show"}
        </button>
      </div>
      <div className="merch-row">
        <span className="merch-state">
          <strong>Flash</strong>
          <Badge tone={flashTone}>{flashStatus}</Badge>
        </span>
        <button
          className="table-button merch-action-button"
          type="button"
          disabled={disabled}
          onClick={() =>
            product.isFlashSale && !flashExpired
              ? onUpdate({ isFlashSale: false, flashSaleEndsAt: null })
              : onUpdate({
                  isFlashSale: true,
                  flashSaleEndsAt: nextFlashSaleEnd(),
                })
          }
        >
          {flashActionLabel}
        </button>
      </div>
      {product.isFlashSale && <span className="merch-note">{flashDetail}</span>}
    </div>
  );
}

function StockCell({ product }: { product: Product }) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return <Badge tone="neutral">No variants</Badge>;

  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const tone = totalStock <= 0 ? "danger" : totalStock <= 10 ? "warn" : "good";
  const lowest = variants.reduce(
    (min, variant) => Math.min(min, variant.stock),
    Number.POSITIVE_INFINITY,
  );

  return (
    <div className="stock-cell">
      <Badge tone={tone}>{totalStock <= 0 ? "Out" : `${totalStock} stock`}</Badge>
      <span>{variants.length} variants · min {lowest}</span>
    </div>
  );
}

function AssetPreview({ value, label }: { value?: string; label: string }) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (!isAssetUrl(trimmed)) {
    return <span className="field-hint">Preview appears after a valid asset URL.</span>;
  }

  return (
    <div className="asset-preview">
      <img src={normalizeAssetUrl(trimmed)} alt={label} loading="lazy" />
      <span>{label}</span>
    </div>
  );
}

function isFlashSaleActive(product: Product) {
  if (!product.isFlashSale) return false;
  if (!product.flashSaleEndsAt) return true;
  return Date.parse(product.flashSaleEndsAt) > Date.now();
}

function productToForm(product: Product): ProductFormInput {
  return {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    categoryId: product.categoryId,
    basePrice: toInputNumber(product.basePrice),
    discountPrice: product.discountPrice == null
      ? ""
      : toInputNumber(product.discountPrice),
    imageUrl: primaryProductImage(product),
    isFeatured: product.isFeatured,
    isFlashSale: product.isFlashSale,
    flashSaleEndsAt: toDateTimeLocal(product.flashSaleEndsAt),
  };
}

function toInputNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

function primaryProductImage(product: Product | null) {
  return product?.images?.[0]?.url ?? "";
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "";
  const date = new Date(time);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function nextFlashSaleEnd() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function toIsoDateTime(value?: string | null) {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function formatFlashSaleEnd(value?: string | null) {
  if (!value) return "no end date";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "invalid date";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(time);
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
  const imageUrl = useWatch({ control: form.control, name: "url" });
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
        <AssetPreview value={imageUrl} label="Attached image preview" />
      </label>
      <button className="ghost-button" type="submit" disabled={isPending}>
        <ImagePlus size={16} /> Attach image
      </button>
    </form>
  );
}
