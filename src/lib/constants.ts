import type { NotificationType, OrderStatus, VoucherType } from '../types'

export const orderStatuses: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
]

export const allowedStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID'],
  PAID: ['PACKED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const voucherTypes: VoucherType[] = ['FIXED', 'PERCENTAGE']
export const notificationTypes: NotificationType[] = ['PROMO', 'ORDER', 'SYSTEM']
