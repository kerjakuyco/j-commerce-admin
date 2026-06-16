import { format } from 'date-fns'

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : Number(value)
}

export function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(toNumber(value))
}

export function number(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function shortDate(value: string) {
  return format(new Date(value), 'dd MMM yyyy')
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function readError(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}
