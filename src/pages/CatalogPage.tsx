import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  PackagePlus,
  Pencil,
  Search,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ActionSheet } from "../components/ActionSheet";
import { Badge } from "../components/Badge";
import {
  DataTable,
  type ColumnDef,
  type SortChangeDirection,
  type SortDirection,
} from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { ImageUploadButton } from "../components/ImageUploadButton";
import { LoadingState } from "../components/LoadingState";
import { NumberInput } from "../components/NumberInput";
import { PaginationStrip } from "../components/PaginationStrip";
import { Panel } from "../components/Panel";
import { SelectMenu } from "../components/SelectMenu";
import { useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { request } from "../lib/api";
import { assetUrlMessage, isAssetUrl, normalizeAssetUrl } from "../lib/asset-url";
import {
  money,
  parseWholeNumberInput,
  readError,
  readFormError,
  slugify,
} from "../lib/format";
import { useDebouncedSearchParam } from "../lib/useDebouncedSearchParam";
import type {
  Category,
  Paginated,
  Product,
  ProductImage,
  ProductVariant,
} from "../types";

const optionalNumber = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = parseWholeNumberInput(value);
    return normalized === "" ? undefined : normalized;
  },
  z.coerce.number().optional(),
);
const requiredNumber = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = parseWholeNumberInput(value);
    return normalized === "" ? undefined : normalized;
  },
  z.coerce.number(),
);
const requiredInt = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = parseWholeNumberInput(value);
    return normalized === "" ? undefined : normalized;
  },
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
const emptyVariantForm: VariantFormInput = {
  productId: "",
  name: "",
  sku: "",
  price: 0,
  stock: 0,
};
const emptyCategoryForm: CategoryFormInput = {
  name: "",
  slug: "",
  icon: "",
  sortOrder: 0,
};
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const catalogSortKeys = ["createdAt", "name", "brand", "category", "basePrice", "rating"] as const;
type CatalogSortKey = (typeof catalogSortKeys)[number];

function isCatalogSortKey(value: string): value is CatalogSortKey {
  return (catalogSortKeys as readonly string[]).includes(value);
}

function isSortDirection(value: string): value is SortDirection {
  return value === "asc" || value === "desc";
}

const copy = {
  en: {
    sortLabels: {
      newest: "Newest",
      price_asc: "Price low",
      price_desc: "Price high",
      rating: "Top rated",
      sold: "Best sold",
    },
    productCreated: "Product created",
    productUpdated: "Product updated",
    merchandisingUpdated: "Merchandising updated",
    variantAdded: "Variant added",
    categoryCreated: "Category created",
    productRemoved: "Product removed",
    imageAttached: "Gambar dipasang",
    imageRemoved: "Gambar dihapus",
    imageOrderUpdated: "Urutan gambar diperbarui",
    invalidImageForm: "Select a product and enter a valid image URL",
    productCatalog: "Product catalog",
    productsCount: (count: number) => `${count} ${count === 1 ? "product" : "products"}`,
    filtersLabel: "Catalog filters",
    search: "Search",
    searchPlaceholder: "Name, brand, description",
    noOptions: "No options found",
    category: "Category",
    allCategories: "All categories",
    sort: "Sort",
    reset: "Reset",
    paginationLabel: "Product catalog pagination",
    rowsPerPage: "Rows per page",
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
    tableCaption: "Product catalog table",
    tableColumns: [
      { label: "Product", key: "product", sortKey: "name", sortable: true, defaultSortDirection: "asc" },
      { label: "Brand", key: "brand", sortable: true, defaultSortDirection: "asc" },
      { label: "Category", key: "category", sortable: true, defaultSortDirection: "asc" },
      { label: "Price", key: "price", sortKey: "basePrice", sortable: true, defaultSortDirection: "asc" },
      { label: "Rating", key: "rating", sortable: true },
      { label: "Variants", key: "variants" },
      { label: "Stock", key: "stock" },
      { label: "Merchandising", key: "merchandising" },
      { label: "Action", key: "action" },
    ] satisfies ColumnDef[],
    editProduct: (name: string) => `Edit ${name}`,
    deleteProduct: (name: string) => `Delete ${name}`,
    edit: "Edit",
    delete: "Delete",
    deleteProductConfirm: (name: string) =>
      `Remove product "${name}"? It will be hidden from the storefront but existing orders remain unaffected.`,
    createProduct: "Create product",
    productDetails: "product details",
    name: "Name",
    productName: "Product name",
    slug: "Slug",
    slugAuto: "Slug (auto if empty)",
    brand: "Brand",
    selectCategory: "Select category",
    basePrice: "Base price",
    discountPrice: "Discount price",
    imageUrl: "Image URL",
    productImagePreview: "Preview gambar produk",
    homeSections: "Area home",
    homeSectionsHelp: "Choose where this product appears.",
    merchandisingFlags: "Merchandising flags",
    featured: "Featured",
    featuredHelp: "Produk Pilihan section.",
    flashSale: "Flash sale",
    flashSaleHelp: "Timed promo section.",
    flashSaleEnds: "Flash sale berakhir",
    flashSaleHint: "Optional. Quick actions use a 7-day window.",
    description: "Description",
    update: "Update",
    create: "Create",
    cancelEdit: "Cancel",
    manageVariants: "Manage variants",
    manageImages: "Manage images",
    inventory: "inventory",
    product: "Product",
    selectProduct: "Select product",
    variantName: "Variant name",
    sku: "SKU",
    price: "Price",
    stock: "Stock",
    addVariant: "Add variant",
    createCategory: "Create category",
    createCategoryDialog: "Create",
    organization: "organisasi",
    categoryName: "Category name",
    icon: "Icon",
    sortOrder: "Sort order",
    loadingProductImages: "Loading product images...",
    imageGallery: "Image gallery",
    imageGalleryHelp: "First image is used as the storefront primary image.",
    noImages: "No images attached yet.",
    primaryImage: "Primary image",
    imageNumber: (index: number) => `Image ${index}`,
    setImagePrimary: "Set image as primary",
    setPrimary: "Set primary",
    moveImageUp: "Move image up",
    moveUp: "Move up",
    moveImageDown: "Move image down",
    moveDown: "Move down",
    deleteImage: "Delete image",
    deleteImageConfirm: "Delete this product image?",
    on: "On",
    off: "Off",
    hide: "Hide",
    show: "Show",
    flash: "Flash",
    expired: "Expired",
    live: "Live",
    flashExpired: "Expired",
    flashEnds: "Ends",
    startFlashWindow: "Start a 7-day flash window",
    renew7d: "Renew 7d",
    end: "End",
    start7d: "Start 7d",
    noVariants: "No variants",
    out: "Out",
    stockCount: (count: number) => `${count} stock`,
    variantsMin: (count: number, min: number) => `${count} variants · min ${min}`,
    previewHint: "Preview appears after a valid asset URL.",
    noEndDate: "no end date",
    invalidDate: "invalid date",
    attachedImagePreview: "Attached image preview",
    attachImage: "Attach image",
  },
  id: {
    sortLabels: {
      newest: "Terbaru",
      price_asc: "Harga rendah",
      price_desc: "Harga tinggi",
      rating: "Rating tertinggi",
      sold: "Terlaris",
    },
    productCreated: "Produk dibuat",
    productUpdated: "Produk diperbarui",
    merchandisingUpdated: "Merchandising diperbarui",
    variantAdded: "Varian ditambahkan",
    categoryCreated: "Kategori dibuat",
    productRemoved: "Produk dihapus",
    imageAttached: "Image attached",
    imageRemoved: "Image removed",
    imageOrderUpdated: "Image order updated",
    invalidImageForm: "Pilih produk dan masukkan URL gambar yang valid",
    productCatalog: "Katalog produk",
    productsCount: (count: number) => `${count} produk`,
    filtersLabel: "Filter katalog",
    search: "Cari",
    searchPlaceholder: "Nama, brand, deskripsi",
    noOptions: "Tidak ada opsi",
    category: "Kategori",
    allCategories: "Semua kategori",
    sort: "Urutkan",
    reset: "Reset",
    paginationLabel: "Pagination katalog produk",
    rowsPerPage: "Baris per halaman",
    previous: "Sebelumnya",
    next: "Berikutnya",
    pageOf: (page: number, totalPages: number) => `Halaman ${page} dari ${totalPages}`,
    tableCaption: "Tabel katalog produk",
    tableColumns: [
      { label: "Produk", key: "product", sortKey: "name", sortable: true, defaultSortDirection: "asc" },
      { label: "Brand", key: "brand", sortable: true, defaultSortDirection: "asc" },
      { label: "Kategori", key: "category", sortable: true, defaultSortDirection: "asc" },
      { label: "Harga", key: "price", sortKey: "basePrice", sortable: true, defaultSortDirection: "asc" },
      { label: "Rating", key: "rating", sortable: true },
      { label: "Varian", key: "variants" },
      { label: "Stok", key: "stock" },
      { label: "Merchandising", key: "merchandising" },
      { label: "Aksi", key: "action" },
    ] satisfies ColumnDef[],
    editProduct: (name: string) => `Edit ${name}`,
    deleteProduct: (name: string) => `Hapus ${name}`,
    edit: "Edit",
    delete: "Hapus",
    deleteProductConfirm: (name: string) =>
      `Hapus produk "${name}"? Produk akan disembunyikan dari storefront, tetapi pesanan yang ada tetap aman.`,
    createProduct: "Buat produk",
    productDetails: "detail produk",
    name: "Nama",
    productName: "Nama produk",
    slug: "Slug",
    slugAuto: "Slug (otomatis jika kosong)",
    brand: "Brand",
    selectCategory: "Pilih kategori",
    basePrice: "Harga dasar",
    discountPrice: "Harga diskon",
    imageUrl: "Image URL",
    productImagePreview: "Product image preview",
    homeSections: "Home sections",
    homeSectionsHelp: "Pilih area tampil produk ini.",
    merchandisingFlags: "Flag merchandising",
    featured: "Featured",
    featuredHelp: "Section Produk Pilihan.",
    flashSale: "Flash sale",
    flashSaleHelp: "Section promo berbatas waktu.",
    flashSaleEnds: "Flash sale ends",
    flashSaleHint: "Opsional. Aksi cepat memakai jendela 7 hari.",
    description: "Deskripsi",
    update: "Perbarui",
    create: "Buat",
    cancelEdit: "Batal",
    manageVariants: "Kelola varian",
    manageImages: "Kelola gambar",
    inventory: "inventory",
    product: "Produk",
    selectProduct: "Pilih produk",
    variantName: "Nama varian",
    sku: "SKU",
    price: "Harga",
    stock: "Stok",
    addVariant: "Tambah varian",
    createCategory: "Buat kategori",
    createCategoryDialog: "Buat",
    organization: "organization",
    categoryName: "Nama kategori",
    icon: "Ikon",
    sortOrder: "Urutan tampil",
    loadingProductImages: "Memuat gambar produk...",
    imageGallery: "Galeri gambar",
    imageGalleryHelp: "Gambar pertama dipakai sebagai primary image storefront.",
    noImages: "Belum ada gambar terpasang.",
    primaryImage: "Primary image",
    imageNumber: (index: number) => `Gambar ${index}`,
    setImagePrimary: "Jadikan gambar utama",
    setPrimary: "Set primary",
    moveImageUp: "Naikkan gambar",
    moveUp: "Naikkan",
    moveImageDown: "Turunkan gambar",
    moveDown: "Turunkan",
    deleteImage: "Hapus gambar",
    deleteImageConfirm: "Hapus gambar produk ini?",
    on: "On",
    off: "Off",
    hide: "Hide",
    show: "Show",
    flash: "Flash",
    expired: "Expired",
    live: "Live",
    flashExpired: "Expired",
    flashEnds: "Ends",
    startFlashWindow: "Mulai jendela flash 7 hari",
    renew7d: "Renew 7d",
    end: "End",
    start7d: "Start 7d",
    noVariants: "Tidak ada varian",
    out: "Habis",
    stockCount: (count: number) => `${count} stok`,
    variantsMin: (count: number, min: number) => `${count} varian · min ${min}`,
    previewHint: "Preview muncul setelah URL aset valid.",
    noEndDate: "tanpa tanggal berakhir",
    invalidDate: "tanggal tidak valid",
    attachedImagePreview: "Preview gambar terpasang",
    attachImage: "Pasang gambar",
  },
} as const;

type CatalogCopy = (typeof copy)[Language];

export function CatalogPage() {
  const token = useToken();
  const { language } = useI18n();
  const c = copy[language];
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get("search") ?? "";
  const categoryFromUrl = searchParams.get("categoryId") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "";
  const sortDirParam = searchParams.get("sortDir") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const pageSizeParam = Number(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE));
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [variantSheetOpen, setVariantSheetOpen] = useState(false);
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const catalogSearch = searchFromUrl;
  const [catalogSearchDraft, setCatalogSearchDraft] = useDebouncedSearchParam({
    value: catalogSearch,
    searchParams,
    setSearchParams,
  });
  const catalogCategoryId = categoryFromUrl;
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeParam)
    ? pageSizeParam
    : DEFAULT_PAGE_SIZE;
  const visibleSortBy = isCatalogSortKey(sortByParam) ? sortByParam : "";
  const visibleSortDir = isSortDirection(sortDirParam) ? sortDirParam : "desc";
  const sortBy = visibleSortBy || "createdAt";
  const sortDir = visibleSortBy ? visibleSortDir : "desc";
  const setCatalogParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  };
  const productQuery = new URLSearchParams({
    limit: String(pageSize),
    page: String(page),
    sortBy,
    sortDir,
  });
  if (catalogSearch.trim()) productQuery.set("search", catalogSearch.trim());
  if (catalogCategoryId) productQuery.set("categoryId", catalogCategoryId);
  const productsQuery = useQuery({
    queryKey: [
      "products",
      catalogSearch.trim(),
      catalogCategoryId,
      sortBy,
      sortDir,
      page,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      request<Paginated<Product>>(`/products?${productQuery.toString()}`, {
        token,
        signal,
      }),
    placeholderData: (previousData) => previousData,
  });

  const setCatalogSort = (key: string, direction: SortChangeDirection) => {
    const next = new URLSearchParams(searchParams);
    if (direction) {
      next.set("sortBy", key);
      next.set("sortDir", direction);
    } else {
      next.delete("sortBy");
      next.delete("sortDir");
    }
    next.set("page", "1");
    setSearchParams(next);
  };
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
    defaultValues: emptyVariantForm,
  });
  const categoryForm = useForm<CategoryFormInput, unknown, CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategoryForm,
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
      setProductSheetOpen(false);
      setEditingProduct(null);
      productForm.reset(emptyProductForm);
      await invalidateCatalog();
      toast.success(c.productCreated);
    },
    onError: (error) => toast.error(readError(error, language)),
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
      setProductSheetOpen(false);
      setEditingProduct(null);
      productForm.reset(emptyProductForm);
      await invalidateCatalog(variables.id);
      toast.success(c.productUpdated);
    },
    onError: (error) => toast.error(readError(error, language)),
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
      toast.success(c.merchandisingUpdated);
    },
    onError: (error) => toast.error(readError(error, language)),
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
      variantForm.reset(emptyVariantForm);
      await invalidateCatalog();
      toast.success(c.variantAdded);
    },
    onError: (error) => toast.error(readError(error, language)),
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
      setCategorySheetOpen(false);
      categoryForm.reset(emptyCategoryForm);
      await invalidateCatalog();
      toast.success(c.categoryCreated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });

  const deleteProduct = useMutation({
    // Soft-delete: the storefront hides the product but existing orders keep
    // their snapshots intact.
    mutationFn: (id: string) =>
      request<{ message: string }>(`/products/${id}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: async (_result, id) => {
      if (editingProduct?.id === id) {
        setProductSheetOpen(false);
        setEditingProduct(null);
        productForm.reset(emptyProductForm);
      }
      await invalidateCatalog();
      toast.success(c.productRemoved);
    },
    onError: (error) => toast.error(readError(error, language)),
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
      toast.success(c.imageAttached);
    },
    onError: (error) => toast.error(readError(error, language)),
  });

  const deleteImage = useMutation({
    mutationFn: ({ id }: { productId: string; id: string }) =>
      request<{ message: string }>(`/images/${id}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: async (_result, variables) => {
      await invalidateCatalog(variables.productId);
      toast.success(c.imageRemoved);
    },
    onError: (error) => toast.error(readError(error, language)),
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
      toast.success(c.imageOrderUpdated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });

  if (productsQuery.isLoading || categoriesQuery.isLoading)
    return <LoadingState />;
  if (productsQuery.error)
    return <ErrorState message={readError(productsQuery.error, language)} />;
  if (categoriesQuery.error)
    return <ErrorState message={readError(categoriesQuery.error, language)} />;

  const products = productsQuery.data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const imageProduct = productDetailQuery.data ?? editingProduct;
  const savingProduct = createProduct.isPending || updateProduct.isPending;
  const startCreatingProduct = () => {
    setEditingProduct(null);
    productForm.reset(emptyProductForm);
    setProductSheetOpen(true);
  };

  const startEditingProduct = (product: Product) => {
    setEditingProduct(product);
    productForm.reset(productToForm(product));
    setProductSheetOpen(true);
  };

  const cancelEditingProduct = () => {
    setProductSheetOpen(false);
    setEditingProduct(null);
    productForm.reset(emptyProductForm);
  };

  const closeVariantSheet = () => {
    setVariantSheetOpen(false);
    variantForm.reset(emptyVariantForm);
  };

  const closeImageSheet = () => {
    setImageSheetOpen(false);
  };

  const closeCategorySheet = () => {
    setCategorySheetOpen(false);
    categoryForm.reset(emptyCategoryForm);
  };

  return (
    <div className="catalog-layout">
      <Panel
        title={c.productCatalog}
        eyebrow={c.inventory}
        headerMeta={c.productsCount(productsQuery.data?.meta.total ?? products.length)}
        className="catalog-table-panel"
      >
        <div className="catalog-toolbar" aria-label={c.filtersLabel}>
          <label htmlFor="catalog-search">
            {c.search}
            <span className="filter-input-with-icon">
              <Search size={16} aria-hidden="true" />
              <input
                id="catalog-search"
                value={catalogSearchDraft}
                onChange={(event) => setCatalogSearchDraft(event.target.value)}
                placeholder={c.searchPlaceholder}
                type="search"
              />
            </span>
          </label>
          <label htmlFor="catalog-category-filter">
            {c.category}
            <SelectMenu
              id="catalog-category-filter"
              value={catalogCategoryId}
              searchable
              searchPlaceholder={c.search}
              noResultsLabel={c.noOptions}
              options={[
                { value: "", label: c.allCategories },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
              onChange={(value) => setCatalogParam("categoryId", value)}
            />
          </label>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setSearchParams(new URLSearchParams());
            }}
          >
            {c.reset}
          </button>
        </div>
        <DataTable
          caption={c.tableCaption}
          columns={[...c.tableColumns]}
          sort={{ key: visibleSortBy, direction: visibleSortDir, onSort: setCatalogSort }}
          keyExtractor={(_row, index) => products[index]?.id ?? index}
          rows={products.map((product) => [
            product.name,
            product.brand,
            product.category?.name ?? "-",
            money(product.discountPrice ?? product.basePrice),
            <Badge tone="hot">{product.rating.toFixed(1)}</Badge>,
            product._count?.variants ?? product.variants?.length ?? 0,
            <StockCell product={product} c={c} />,
            <ProductMerchandisingCell
              product={product}
              language={language}
              c={c}
              disabled={updateMerchandising.isPending}
              onUpdate={(values) =>
                updateMerchandising.mutate({ id: product.id, ...values })
              }
            />,
            <div className="table-actions">
              <button
                className="icon-button"
                type="button"
                aria-label={c.editProduct(product.name)}
                title={c.edit}
                onClick={() => startEditingProduct(product)}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button icon-button-danger"
                type="button"
                aria-label={c.deleteProduct(product.name)}
                title={c.delete}
                onClick={() => {
                  if (window.confirm(c.deleteProductConfirm(product.name))) {
                    deleteProduct.mutate(product.id);
                  }
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>,
          ])}
        />
        <PaginationStrip
          meta={productsQuery.data?.meta}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          label={c.paginationLabel}
          pageSizeLabel={c.rowsPerPage}
          previous={c.previous}
          next={c.next}
          pageOf={c.pageOf}
          onPageChange={(nextPage) => {
            const next = new URLSearchParams(searchParams);
            next.set("page", String(nextPage));
            setSearchParams(next);
          }}
          onPageSizeChange={(nextPageSize) => {
            const next = new URLSearchParams(searchParams);
            next.set("limit", String(nextPageSize));
            next.set("page", "1");
            setSearchParams(next);
          }}
        />
      </Panel>
      <div className="panel-external-actions">
        <button
          className="ghost-button"
          type="button"
          onClick={() => setVariantSheetOpen(true)}
        >
          <Tags size={17} aria-hidden="true" />
          {c.manageVariants}
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => setImageSheetOpen(true)}
        >
          <ImagePlus size={17} aria-hidden="true" />
          {c.manageImages}
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => setCategorySheetOpen(true)}
        >
          <Tags size={17} aria-hidden="true" />
          {c.createCategory}
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={startCreatingProduct}
        >
          <PackagePlus size={17} aria-hidden="true" />
          {c.createProduct}
        </button>
      </div>
      <ActionSheet
        open={productSheetOpen}
        title={editingProduct ? c.editProduct(editingProduct.name) : c.createProduct}
        eyebrow={editingProduct ? editingProduct.name : c.productDetails}
        closeLabel={c.cancelEdit}
        onClose={() => {
          if (!savingProduct) cancelEditingProduct();
        }}
      >
        <form
          id="catalog-product-form"
          className="control-form product-form-grid action-sheet-form"
          onSubmit={productForm.handleSubmit((values) =>
            editingProduct
              ? updateProduct.mutate({ id: editingProduct.id, values })
              : createProduct.mutate(values),
          )}
        >
          <label htmlFor="product-name">
            {c.name}
            <input
              id="product-name"
              {...productForm.register("name")}
              placeholder={c.productName}
            />
            {productForm.formState.errors.name && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.name.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="product-slug">
            {c.slug}
            <input
              id="product-slug"
              {...productForm.register("slug")}
              placeholder={c.slugAuto}
            />
            {productForm.formState.errors.slug && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.slug.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="product-brand">
            {c.brand}
            <input
              id="product-brand"
              {...productForm.register("brand")}
              placeholder={c.brand}
            />
            {productForm.formState.errors.brand && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.brand.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="product-category">
            {c.category}
            <Controller
              control={productForm.control}
              name="categoryId"
              render={({ field }) => (
                <SelectMenu
                  id="product-category"
                  value={field.value ?? ""}
                  searchable
                  searchPlaceholder={c.search}
                  noResultsLabel={c.noOptions}
                  options={[
                    { value: "", label: c.selectCategory },
                    ...categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                  onChange={field.onChange}
                />
              )}
            />
            {productForm.formState.errors.categoryId && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.categoryId.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="product-basePrice">
            {c.basePrice}
            <Controller
              control={productForm.control}
              name="basePrice"
              render={({ field }) => (
                <NumberInput
                  id="product-basePrice"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.basePrice}
                />
              )}
            />
            {productForm.formState.errors.basePrice && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.basePrice.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="product-discountPrice">
            {c.discountPrice}
            <Controller
              control={productForm.control}
              name="discountPrice"
              render={({ field }) => (
                <NumberInput
                  id="product-discountPrice"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.discountPrice}
                />
              )}
            />
            {productForm.formState.errors.discountPrice && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.discountPrice.message, language)}
              </span>
            )}
          </label>
          <label className="field-wide" htmlFor="product-imageUrl">
            {c.imageUrl}
            <input
              id="product-imageUrl"
              {...productForm.register("imageUrl")}
              placeholder={c.imageUrl}
            />
            <ImageUploadButton
              disabled={savingProduct}
              onUploaded={(url) =>
                productForm.setValue("imageUrl", url, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {productForm.formState.errors.imageUrl && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.imageUrl.message, language)}
              </span>
            )}
            <AssetPreview value={productImagePreview} label={c.productImagePreview} c={c} />
          </label>
          <div className="merch-form-panel field-wide">
            <div className="merch-form-heading">
              <strong>{c.homeSections}</strong>
              <span>{c.homeSectionsHelp}</span>
            </div>
            <div className="check-grid" aria-label={c.merchandisingFlags}>
              <label className="check-row" htmlFor="product-isFeatured">
                <input
                  id="product-isFeatured"
                  type="checkbox"
                  {...productForm.register("isFeatured")}
                />
                <span>
                  <strong>{c.featured}</strong>
                  <small>{c.featuredHelp}</small>
                </span>
              </label>
              <label className="check-row" htmlFor="product-isFlashSale">
                <input
                  id="product-isFlashSale"
                  type="checkbox"
                  {...productForm.register("isFlashSale")}
                />
                <span>
                  <strong>{c.flashSale}</strong>
                  <small>{c.flashSaleHelp}</small>
                </span>
              </label>
            </div>
            <label className="merch-form-date" htmlFor="product-flashSaleEndsAt">
              {c.flashSaleEnds}
              <input
                id="product-flashSaleEndsAt"
                {...productForm.register("flashSaleEndsAt")}
                type="datetime-local"
              />
              <span className="field-hint">
                {c.flashSaleHint}
              </span>
              {productForm.formState.errors.flashSaleEndsAt && (
                <span className="field-error">
                  {readFormError(
                    productForm.formState.errors.flashSaleEndsAt.message,
                    language,
                  )}
                </span>
              )}
            </label>
          </div>
          <label className="field-wide" htmlFor="product-description">
            {c.description}
            <textarea
              id="product-description"
              {...productForm.register("description")}
              placeholder={c.description}
            />
            {productForm.formState.errors.description && (
              <span className="field-error">
                {readFormError(productForm.formState.errors.description.message, language)}
              </span>
            )}
          </label>
          <div className="form-actions form-submit">
            <button
              className="ghost-button"
              type="button"
              disabled={savingProduct}
              onClick={cancelEditingProduct}
            >
              {c.cancelEdit}
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={savingProduct}
            >
              <PackagePlus size={17} /> {editingProduct ? c.update : c.create}
            </button>
          </div>
        </form>
        {editingProduct && (
          <ProductImageGallery
            product={imageProduct}
            loading={productDetailQuery.isLoading}
            deletingImageId={deleteImage.variables?.id}
            disabled={deleteImage.isPending || reorderImages.isPending}
            c={c}
            onDelete={(productId, imageId) =>
              deleteImage.mutate({ productId, id: imageId })
            }
            onReorder={(productId, images) =>
              reorderImages.mutate({ productId, images })
            }
          />
        )}
      </ActionSheet>
      <ActionSheet
        open={variantSheetOpen}
        title={c.manageVariants}
        eyebrow={c.inventory}
        closeLabel={c.cancelEdit}
        onClose={() => {
          if (!createVariant.isPending) {
            closeVariantSheet();
          }
        }}
      >
        <form
          className="control-form action-sheet-form"
          onSubmit={variantForm.handleSubmit((values) =>
            createVariant.mutate(values),
          )}
        >
          <label htmlFor="variant-productId">
            {c.product}
            <Controller
              control={variantForm.control}
              name="productId"
              render={({ field }) => (
                <SelectMenu
                  id="variant-productId"
                  value={field.value ?? ""}
                  searchable
                  searchPlaceholder={c.search}
                  noResultsLabel={c.noOptions}
                  options={[
                    { value: "", label: c.selectProduct },
                    ...products.map((product) => ({
                      value: product.id,
                      label: product.name,
                    })),
                  ]}
                  onChange={field.onChange}
                />
              )}
            />
            {variantForm.formState.errors.productId && (
              <span className="field-error">
                {readFormError(variantForm.formState.errors.productId.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="variant-name">
            {c.variantName}
            <input
              id="variant-name"
              {...variantForm.register("name")}
              placeholder={c.variantName}
            />
            {variantForm.formState.errors.name && (
              <span className="field-error">
                {readFormError(variantForm.formState.errors.name.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="variant-sku">
            {c.sku}
            <input
              id="variant-sku"
              {...variantForm.register("sku")}
              placeholder={c.sku}
            />
            {variantForm.formState.errors.sku && (
              <span className="field-error">
                {readFormError(variantForm.formState.errors.sku.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="variant-price">
            {c.price}
            <Controller
              control={variantForm.control}
              name="price"
              render={({ field }) => (
                <NumberInput
                  id="variant-price"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.price}
                />
              )}
            />
            {variantForm.formState.errors.price && (
              <span className="field-error">
                {readFormError(variantForm.formState.errors.price.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="variant-stock">
            {c.stock}
            <Controller
              control={variantForm.control}
              name="stock"
              render={({ field }) => (
                <NumberInput
                  id="variant-stock"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.stock}
                />
              )}
            />
            {variantForm.formState.errors.stock && (
              <span className="field-error">
                {readFormError(variantForm.formState.errors.stock.message, language)}
              </span>
            )}
          </label>
          <div className="form-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={createVariant.isPending}
              onClick={closeVariantSheet}
            >
              {c.cancelEdit}
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={createVariant.isPending}
            >
              <Tags size={17} /> {c.addVariant}
            </button>
          </div>
        </form>
      </ActionSheet>
      <ActionSheet
        open={imageSheetOpen}
        title={c.manageImages}
        eyebrow={c.imageGallery}
        closeLabel={c.cancelEdit}
        onClose={() => {
          if (!addImage.isPending) closeImageSheet();
        }}
      >
        <ImageAttachForm
          products={products}
          isPending={addImage.isPending}
          language={language}
          c={c}
          onCancel={closeImageSheet}
          onAdd={(productId, url) => addImage.mutateAsync({ productId, url })}
        />
      </ActionSheet>
      <ActionSheet
        open={categorySheetOpen}
        title={c.createCategory}
        eyebrow={c.organization}
        closeLabel={c.cancelEdit}
        onClose={() => {
          if (!createCategory.isPending) closeCategorySheet();
        }}
      >
        <form
          className="control-form action-sheet-form"
          onSubmit={categoryForm.handleSubmit((values) =>
            createCategory.mutate(values),
          )}
        >
          <label htmlFor="category-name">
            {c.categoryName}
            <input
              id="category-name"
              {...categoryForm.register("name")}
              placeholder={c.categoryName}
            />
            {categoryForm.formState.errors.name && (
              <span className="field-error">
                {readFormError(categoryForm.formState.errors.name.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="category-slug">
            {c.slug}
            <input
              id="category-slug"
              {...categoryForm.register("slug")}
              placeholder={c.slug}
            />
            {categoryForm.formState.errors.slug && (
              <span className="field-error">
                {readFormError(categoryForm.formState.errors.slug.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="category-icon">
            {c.icon}
            <input
              id="category-icon"
              {...categoryForm.register("icon")}
              placeholder={c.icon}
            />
            {categoryForm.formState.errors.icon && (
              <span className="field-error">
                {readFormError(categoryForm.formState.errors.icon.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="category-sortOrder">
            {c.sortOrder}
            <Controller
              control={categoryForm.control}
              name="sortOrder"
              render={({ field }) => (
                <NumberInput
                  id="category-sortOrder"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.sortOrder}
                />
              )}
            />
            {categoryForm.formState.errors.sortOrder && (
              <span className="field-error">
                {readFormError(categoryForm.formState.errors.sortOrder.message, language)}
              </span>
            )}
          </label>
          <div className="form-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={createCategory.isPending}
              onClick={closeCategorySheet}
            >
              {c.cancelEdit}
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={createCategory.isPending}
            >
              <Tags size={17} /> {c.createCategoryDialog}
            </button>
          </div>
        </form>
      </ActionSheet>
    </div>
  );
}

function ProductImageGallery({
  product,
  loading,
  disabled,
  deletingImageId,
  c,
  onDelete,
  onReorder,
}: {
  product: Product | null;
  loading: boolean;
  disabled: boolean;
  deletingImageId?: string;
  c: CatalogCopy;
  onDelete: (productId: string, imageId: string) => void;
  onReorder: (productId: string, images: { id: string; sortOrder: number }[]) => void;
}) {
  if (loading) {
    return <p className="image-gallery-empty">{c.loadingProductImages}</p>;
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
    <section className="product-image-gallery" aria-label={c.imageGallery}>
      <div className="product-image-gallery-heading">
        <strong>{c.imageGallery}</strong>
        <span>{c.imageGalleryHelp}</span>
      </div>
      {images.length === 0 ? (
        <p className="image-gallery-empty">{c.noImages}</p>
      ) : (
        <div className="image-gallery-list">
          {images.map((image, index) => (
            <article key={image.id} className="image-gallery-card">
              <img src={normalizeAssetUrl(image.url)} alt="" loading="lazy" />
              <div>
                <strong>{index === 0 ? c.primaryImage : c.imageNumber(index + 1)}</strong>
                <span title={image.url}>{image.url}</span>
              </div>
              <div className="image-gallery-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={c.setImagePrimary}
                  title={c.setPrimary}
                  disabled={disabled || index === 0}
                  onClick={() => applyOrder([image, ...images.filter((item) => item.id !== image.id)])}
                >
                  <Star size={16} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={c.moveImageUp}
                  title={c.moveUp}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={c.moveImageDown}
                  title={c.moveDown}
                  disabled={disabled || index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  className="icon-button icon-button-danger"
                  type="button"
                  aria-label={c.deleteImage}
                  title={c.deleteImage}
                  disabled={disabled || deletingImageId === image.id}
                  onClick={() => {
                    if (window.confirm(c.deleteImageConfirm)) {
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
  language,
  c,
  disabled,
  onUpdate,
}: {
  product: Product;
  language: Language;
  c: CatalogCopy;
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
    ? c.off
    : flashExpired
      ? c.expired
      : c.live;
  const flashTone = !product.isFlashSale
    ? "neutral"
    : flashExpired
      ? "danger"
      : "warn";
  const flashDetail = product.isFlashSale
    ? `${flashExpired ? c.flashExpired : c.flashEnds} ${formatFlashSaleEnd(
        product.flashSaleEndsAt,
        language,
        c,
      )}`
    : c.flashSaleHelp;
  const flashActionLabel = product.isFlashSale
    ? flashExpired
      ? c.renew7d
      : c.end
    : c.start7d;

  return (
    <div className="merch-cell">
      <div className="merch-row" data-state={product.isFeatured ? "on" : "off"}>
        <span className="merch-state">
          <span className="merch-state-heading">
            <span className="merch-dot" aria-hidden="true" />
            <strong>{c.featured}</strong>
            <Badge tone={product.isFeatured ? "hot" : "neutral"}>
              {product.isFeatured ? c.on : c.off}
            </Badge>
          </span>
          <span className="merch-state-detail">{c.featuredHelp}</span>
        </span>
        <button
          className="table-button merch-action-button"
          type="button"
          aria-label={`${product.isFeatured ? c.hide : c.show} ${c.featured}`}
          title={`${product.isFeatured ? c.hide : c.show} ${c.featured}`}
          disabled={disabled}
          onClick={() => onUpdate({ isFeatured: !product.isFeatured })}
        >
          {product.isFeatured ? c.hide : c.show}
        </button>
      </div>
      <div
        className="merch-row"
        data-state={flashExpired ? "expired" : flashActive ? "live" : "off"}
      >
        <span className="merch-state">
          <span className="merch-state-heading">
            <span className="merch-dot" aria-hidden="true" />
            <strong>{c.flash}</strong>
            <Badge tone={flashTone}>{flashStatus}</Badge>
          </span>
          <span className="merch-state-detail">{flashDetail}</span>
        </span>
        <button
          className="table-button merch-action-button"
          type="button"
          aria-label={`${flashActionLabel} ${c.flashSale}`}
          title={`${flashActionLabel} ${c.flashSale}`}
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
    </div>
  );
}

function StockCell({ product, c }: { product: Product; c: CatalogCopy }) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return <Badge tone="neutral">{c.noVariants}</Badge>;

  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const tone = totalStock <= 0 ? "danger" : totalStock <= 10 ? "warn" : "good";
  const lowest = variants.reduce(
    (min, variant) => Math.min(min, variant.stock),
    Number.POSITIVE_INFINITY,
  );

  return (
    <div className="stock-cell">
      <Badge tone={tone}>{totalStock <= 0 ? c.out : c.stockCount(totalStock)}</Badge>
      <span>{c.variantsMin(variants.length, lowest)}</span>
    </div>
  );
}

function AssetPreview({
  value,
  label,
  c,
}: {
  value?: string;
  label: string;
  c: CatalogCopy;
}) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (!isAssetUrl(trimmed)) {
    return <span className="field-hint">{c.previewHint}</span>;
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

function formatFlashSaleEnd(
  value: string | null | undefined,
  language: Language,
  c: CatalogCopy,
) {
  if (!value) return c.noEndDate;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return c.invalidDate;
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(time);
}

function ImageAttachForm({
  products,
  isPending,
  language,
  c,
  onCancel,
  onAdd,
}: {
  products: Product[];
  isPending: boolean;
  language: Language;
  c: CatalogCopy;
  onCancel: () => void;
  onAdd: (productId: string, url: string) => Promise<ProductImage | undefined>;
}) {
  const form = useForm<ImageFormInput, unknown, ImageForm>({
    resolver: zodResolver(imageSchema),
    defaultValues: { productId: "", url: "" },
  });
  const imageUrl = useWatch({ control: form.control, name: "url" });
  return (
    <form
      className="control-form action-sheet-form"
      onSubmit={form.handleSubmit(
        async (values) => {
          try {
            await onAdd(values.productId, values.url);
            form.reset({ productId: "", url: "" });
          } catch {
            // Mutation onError already surfaces the API message.
          }
        },
        () => toast.error(c.invalidImageForm),
      )}
    >
      <label htmlFor="image-productId">
        {c.product}
        <Controller
          control={form.control}
          name="productId"
          render={({ field }) => (
            <SelectMenu
              id="image-productId"
              value={field.value ?? ""}
              searchable
              searchPlaceholder={c.search}
              noResultsLabel={c.noOptions}
              options={[
                { value: "", label: c.selectProduct },
                ...products.map((product) => ({
                  value: product.id,
                  label: product.name,
                })),
              ]}
              onChange={field.onChange}
            />
          )}
        />
        {form.formState.errors.productId && (
          <span className="field-error">
            {readFormError(form.formState.errors.productId.message, language)}
          </span>
        )}
      </label>
      <label htmlFor="image-url">
        {c.imageUrl}
        <input
          id="image-url"
          {...form.register("url")}
          placeholder={c.imageUrl}
        />
        <ImageUploadButton
          disabled={isPending}
          onUploaded={(url) =>
            form.setValue("url", url, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        {form.formState.errors.url && (
          <span className="field-error">
            {readFormError(form.formState.errors.url.message, language)}
          </span>
        )}
        <AssetPreview value={imageUrl} label={c.attachedImagePreview} c={c} />
      </label>
      <div className="form-actions">
        <button
          className="ghost-button"
          type="button"
          disabled={isPending}
          onClick={onCancel}
        >
          {c.cancelEdit}
        </button>
        <button className="primary-button" type="submit" disabled={isPending}>
          <ImagePlus size={16} /> {c.attachImage}
        </button>
      </div>
    </form>
  );
}
