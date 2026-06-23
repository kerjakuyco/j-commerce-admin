export type UserRole = 'ADMIN' | 'CUSTOMER'
export type OrderStatus = 'PENDING' | 'PAID' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED' | 'EXPIRED'
export type VoucherType = 'PERCENTAGE' | 'FIXED'
export type NotificationType = 'PROMO' | 'ORDER' | 'SYSTEM'
export type ShippingMethod = 'REGULAR' | 'EXPRESS' | 'SAME_DAY'

export interface Paginated<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface User {
  id: string
  email: string
  name: string
  phone?: string | null
  avatar?: string | null
  role: UserRole
  isActive?: boolean
  createdAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string | null
  image?: string | null
  description?: string | null
  sortOrder: number
  _count?: { products: number }
}

export interface ProductImage {
  id: string
  url: string
  sortOrder: number
}

export interface ProductVariant {
  id: string
  name: string
  sku: string
  price: string | number
  stock: number
}

export interface Product {
  id: string
  name: string
  slug: string
  brand: string
  description: string
  categoryId: string
  basePrice: string | number
  discountPrice?: string | number | null
  rating: number
  totalReview: number
  totalSold: number
  isFeatured: boolean
  isFlashSale: boolean
  flashSaleEndsAt?: string | null
  isActive: boolean
  category?: Category
  images?: ProductImage[]
  variants?: ProductVariant[]
  _count?: { variants?: number; reviews?: number }
}

export interface Address {
  id: string
  label: string
  recipient: string
  phone: string
  province: string
  city: string
  district: string
  postalCode: string
  fullAddress: string
  isDefault: boolean
}

export interface OrderItem {
  id: string
  productId?: string
  variantId?: string
  productName: string
  productImage?: string | null
  variantName: string
  quantity: number
  price: string | number
  subtotal: string | number
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  shippingMethod: ShippingMethod
  shippingCost: string | number
  subtotal: string | number
  discount: string | number
  total: string | number
  trackingNumber?: string | null
  cancelReason?: string | null
  createdAt: string
  updatedAt?: string
  paidAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
  user?: Pick<User, 'id' | 'name' | 'email' | 'phone'>
  address?: Address
  items?: OrderItem[]
  voucher?: Pick<Voucher, 'id' | 'code' | 'type' | 'value'> | null
  payment?: {
    id: string
    provider?: string | null
    method?: string | null
    status: PaymentStatus
    amount: string | number
    paidAt?: string | null
    expiredAt?: string | null
  } | null
  _count?: { items: number }
}

export interface Voucher {
  id: string
  code: string
  type: VoucherType
  value: string | number
  description?: string | null
  minPurchase: string | number
  maxDiscount?: string | number | null
  quota: number
  usedCount: number
  startsAt: string
  expiresAt: string
  isActive: boolean
}

export interface Banner {
  id: string
  title: string
  image: string
  link?: string | null
  sortOrder: number
  isActive: boolean
}

export interface UploadedFile {
  url: string
  filename: string
  size: number
  mimetype: string
}

export interface DashboardStats {
  totalRevenue: number
  revenueGrowthPercent?: number
  totalOrders: number
  orderGrowthPercent: number
  totalCustomers: number
  totalProducts: number
  recentOrders: Order[]
}

export type DashboardAlertTone = 'neutral' | 'good' | 'warn' | 'danger' | 'hot'

export interface DashboardAlert {
  id: string
  label: string
  count: number
  tone: DashboardAlertTone
  href: string
}

export interface RevenuePoint {
  date: string
  total: number
  orders: number
}

export interface TopProduct {
  product?: Product
  totalSold: number
  revenue: number
}

export interface OrderStatusBreakdown {
  status: OrderStatus
  count: number
}

export interface NotificationRecord {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  createdAt: string
}
