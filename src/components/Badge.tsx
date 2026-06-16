import clsx from 'clsx'
import type { OrderStatus, PaymentStatus } from '../types'

type Tone = 'good' | 'warn' | 'danger' | 'neutral' | 'hot'

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={clsx('badge', `badge-${tone}`)}>{children}</span>
}

export function orderTone(status: OrderStatus): Tone {
  if (['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status)) return 'good'
  if (status === 'PENDING') return 'warn'
  if (status === 'CANCELLED') return 'danger'
  return 'neutral'
}

export function paymentTone(status: PaymentStatus): Tone {
  if (status === 'PAID') return 'good'
  if (status === 'UNPAID') return 'warn'
  if (['FAILED', 'EXPIRED'].includes(status)) return 'danger'
  return 'neutral'
}
