import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, PackagePlus, Tags } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { Panel } from '../components/Panel'
import { useToken } from '../context/AuthContext'
import { request } from '../lib/api'
import { money, readError, slugify } from '../lib/format'
import type { Category, Paginated, Product, ProductImage, ProductVariant } from '../types'

const optionalNumber = z.preprocess((value) => (value === '' ? undefined : value), z.coerce.number().optional())

const productSchema = z.object({
  name: z.string().min(3),
  slug: z.string().optional(),
  brand: z.string().min(2),
  description: z.string().min(12),
  categoryId: z.string().min(1),
  basePrice: z.coerce.number().min(0),
  discountPrice: optionalNumber,
  imageUrl: z.string().url().optional().or(z.literal('')),
})

const variantSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(2),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
})

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
})

type ProductFormInput = z.input<typeof productSchema>
type ProductForm = z.output<typeof productSchema>
type VariantFormInput = z.input<typeof variantSchema>
type VariantForm = z.output<typeof variantSchema>
type CategoryFormInput = z.input<typeof categorySchema>
type CategoryForm = z.output<typeof categorySchema>

export function CatalogPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => request<Paginated<Product>>('/products?limit=80', { token }),
  })
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => request<Category[]>('/categories', { token }),
  })

  const productForm = useForm<ProductFormInput, unknown, ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', slug: '', brand: '', description: '', categoryId: '', basePrice: 0, imageUrl: '' },
  })
  const variantForm = useForm<VariantFormInput, unknown, VariantForm>({
    resolver: zodResolver(variantSchema),
    defaultValues: { productId: '', name: '', sku: '', price: 0, stock: 0 },
  })
  const categoryForm = useForm<CategoryFormInput, unknown, CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', icon: '', sortOrder: 0 },
  })

  const invalidateCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ])
  }

  const createProduct = useMutation({
    mutationFn: (values: ProductForm) =>
      request<Product>('/products', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          slug: values.slug || slugify(values.name),
          brand: values.brand,
          description: values.description,
          categoryId: values.categoryId,
          basePrice: values.basePrice,
          discountPrice: values.discountPrice,
          images: values.imageUrl ? [{ url: values.imageUrl, sortOrder: 0 }] : [],
        }),
      }),
    onSuccess: async () => {
      productForm.reset()
      await invalidateCatalog()
      toast.success('Product created')
    },
    onError: (error) => toast.error(readError(error)),
  })

  const createVariant = useMutation({
    mutationFn: (values: VariantForm) =>
      request<ProductVariant>(`/products/${values.productId}/variants`, {
        token,
        method: 'POST',
        body: JSON.stringify({ name: values.name, sku: values.sku, price: values.price, stock: values.stock }),
      }),
    onSuccess: async () => {
      variantForm.reset()
      await invalidateCatalog()
      toast.success('Variant added')
    },
    onError: (error) => toast.error(readError(error)),
  })

  const createCategory = useMutation({
    mutationFn: (values: CategoryForm) =>
      request<Category>('/categories', {
        token,
        method: 'POST',
        body: JSON.stringify({ ...values, slug: values.slug || slugify(values.name) }),
      }),
    onSuccess: async () => {
      categoryForm.reset({ name: '', slug: '', icon: '', sortOrder: 0 })
      await invalidateCatalog()
      toast.success('Category created')
    },
    onError: (error) => toast.error(readError(error)),
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => request<Product>(`/products/${id}`, { token, method: 'DELETE' }),
    onSuccess: async () => {
      await invalidateCatalog()
      toast.success('Product deleted')
    },
    onError: (error) => toast.error(readError(error)),
  })

  const addImage = useMutation({
    mutationFn: ({ productId, url }: { productId: string; url: string }) =>
      request<ProductImage>(`/products/${productId}/images`, {
        token,
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    onSuccess: async () => {
      await invalidateCatalog()
      toast.success('Image attached')
    },
    onError: (error) => toast.error(readError(error)),
  })

  if (productsQuery.isLoading || categoriesQuery.isLoading) return <LoadingState />
  if (productsQuery.error) return <ErrorState message={readError(productsQuery.error)} />
  if (categoriesQuery.error) return <ErrorState message={readError(categoriesQuery.error)} />

  const products = productsQuery.data?.data ?? []
  const categories = categoriesQuery.data ?? []

  return (
    <div className="catalog-layout">
      <Panel title="Catalog ledger" eyebrow={`${products.length} SKUs`} className="span-2">
        <DataTable
          columns={['Product', 'Brand', 'Category', 'Price', 'Rating', 'Stock hooks', 'Action']}
          rows={products.map((product) => [
            product.name,
            product.brand,
            product.category?.name ?? '-',
            money(product.discountPrice ?? product.basePrice),
            <Badge key={`${product.id}-rating`} tone="hot">{product.rating.toFixed(1)}</Badge>,
            product._count?.variants ?? product.variants?.length ?? 0,
            <button key={product.id} className="table-button" type="button" onClick={() => deleteProduct.mutate(product.id)}>
              Delete
            </button>,
          ])}
        />
      </Panel>
      <Panel title="Create product" eyebrow="merch intake">
        <form className="control-form" onSubmit={productForm.handleSubmit((values) => createProduct.mutate(values))}>
          <input {...productForm.register('name')} placeholder="Product name" />
          <input {...productForm.register('slug')} placeholder="Slug (auto if empty)" />
          <input {...productForm.register('brand')} placeholder="Brand" />
          <select {...productForm.register('categoryId')}>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input {...productForm.register('basePrice')} type="number" placeholder="Base price" />
          <input {...productForm.register('discountPrice')} type="number" placeholder="Discount price" />
          <input {...productForm.register('imageUrl')} placeholder="Image URL" />
          <textarea {...productForm.register('description')} placeholder="Description" />
          <button className="primary-button" disabled={createProduct.isPending}><PackagePlus size={17} /> Create</button>
        </form>
      </Panel>
      <Panel title="Variant + image" eyebrow="stock hooks">
        <form className="control-form" onSubmit={variantForm.handleSubmit((values) => createVariant.mutate(values))}>
          <select {...variantForm.register('productId')}>
            <option value="">Select product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <input {...variantForm.register('name')} placeholder="Variant name" />
          <input {...variantForm.register('sku')} placeholder="SKU" />
          <input {...variantForm.register('price')} type="number" placeholder="Price" />
          <input {...variantForm.register('stock')} type="number" placeholder="Stock" />
          <button className="primary-button" disabled={createVariant.isPending}><Tags size={17} /> Add variant</button>
        </form>
        <ImageAttachForm products={products} onAdd={(productId, url) => addImage.mutate({ productId, url })} />
      </Panel>
      <Panel title="Create category" eyebrow="taxonomy">
        <form className="control-form" onSubmit={categoryForm.handleSubmit((values) => createCategory.mutate(values))}>
          <input {...categoryForm.register('name')} placeholder="Category name" />
          <input {...categoryForm.register('slug')} placeholder="Slug" />
          <input {...categoryForm.register('icon')} placeholder="Icon" />
          <input {...categoryForm.register('sortOrder')} type="number" placeholder="Sort order" />
          <button className="primary-button" disabled={createCategory.isPending}><Tags size={17} /> Create category</button>
        </form>
      </Panel>
    </div>
  )
}

function ImageAttachForm({ products, onAdd }: { products: Product[]; onAdd: (productId: string, url: string) => void }) {
  const form = useForm<{ productId: string; url: string }>({ defaultValues: { productId: '', url: '' } })
  return (
    <form
      className="control-form minor-form"
      onSubmit={form.handleSubmit((values) => {
        onAdd(values.productId, values.url)
        form.reset({ productId: '', url: '' })
      })}
    >
      <select {...form.register('productId')}>
        <option value="">Image target</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>
      <input {...form.register('url')} placeholder="Image URL" />
      <button className="ghost-button" type="submit"><ImagePlus size={16} /> Attach image</button>
    </form>
  )
}
