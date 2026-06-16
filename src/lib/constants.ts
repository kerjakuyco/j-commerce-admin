import type { NotificationType, OrderStatus, VoucherType } from '../types'

export const orderStatuses: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
]

export const voucherTypes: VoucherType[] = ['FIXED', 'PERCENTAGE']
export const notificationTypes: NotificationType[] = ['PROMO', 'ORDER', 'SYSTEM']
