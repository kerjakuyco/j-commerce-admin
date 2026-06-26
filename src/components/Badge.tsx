import clsx from 'clsx'
import type { OrderStatus, PaymentStatus } from '../types'

type Tone =
  | 'good'
  | 'warn'
  | 'danger'
  | 'neutral'
  | 'hot'
  | 'order-pending'
  | 'order-paid'
  | 'order-packed'
  | 'order-shipped'
  | 'order-delivered'
  | 'order-cancelled'

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={clsx('badge', `badge-${tone}`)}>{children}</span>
}

export function orderTone(status: OrderStatus): Tone {
  if (status === 'PENDING') return 'order-pending'
  if (status === 'PAID') return 'order-paid'
  if (status === 'PACKED') return 'order-packed'
  if (status === 'SHIPPED') return 'order-shipped'
  if (status === 'DELIVERED') return 'order-delivered'
  if (status === 'CANCELLED') return 'order-cancelled'
  return 'neutral'
}

export function paymentTone(status: PaymentStatus): Tone {
  if (status === 'PAID') return 'good'
  if (status === 'UNPAID') return 'warn'
  if (['FAILED', 'EXPIRED'].includes(status)) return 'danger'
  return 'neutral'
}
