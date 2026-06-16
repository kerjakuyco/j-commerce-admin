import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TicketPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { DataTable } from '../components/DataTable'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { Panel } from '../components/Panel'
import { useToken } from '../context/AuthContext'
import { voucherTypes } from '../lib/constants'
import { request } from '../lib/api'
import { money, readError, shortDate, toNumber } from '../lib/format'
import type { Paginated, Voucher, VoucherType } from '../types'

const voucherSchema = z.object({
  code: z.string().min(3),
  type: z.enum(['FIXED', 'PERCENTAGE']),
  value: z.coerce.number().min(0),
  minPurchase: z.coerce.number().min(0),
  maxDiscount: z.preprocess((value) => (value === '' ? undefined : value), z.coerce.number().optional()),
  quota: z.coerce.number().int().min(1),
  expiresAt: z.string().min(1),
})

type VoucherFormInput = z.input<typeof voucherSchema>
type VoucherForm = z.output<typeof voucherSchema>

export function VouchersPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const vouchersQuery = useQuery({
    queryKey: ['vouchers'],
    queryFn: () => request<Paginated<Voucher>>('/vouchers?limit=80', { token }),
  })
  const form = useForm<VoucherFormInput, unknown, VoucherForm>({
    resolver: zodResolver(voucherSchema),
    defaultValues: { code: '', type: 'FIXED', value: 0, minPurchase: 0, quota: 100, expiresAt: '' },
  })
  const createVoucher = useMutation({
    mutationFn: (values: VoucherForm) =>
      request<Voucher>('/vouchers', {
        token,
        method: 'POST',
        body: JSON.stringify({ ...values, code: values.code.toUpperCase(), expiresAt: new Date(values.expiresAt).toISOString() }),
      }),
    onSuccess: async () => {
      form.reset({ code: '', type: 'FIXED', value: 0, minPurchase: 0, quota: 100, expiresAt: '' })
      await queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      toast.success('Voucher created')
    },
    onError: (error) => toast.error(readError(error)),
  })

  if (vouchersQuery.isLoading) return <LoadingState />
  if (vouchersQuery.error) return <ErrorState message={readError(vouchersQuery.error)} />

  return (
    <div className="split-layout">
      <Panel title="Voucher vault" eyebrow="promo economics">
        <DataTable
          columns={['Code', 'Type', 'Value', 'Quota', 'Minimum', 'Expires']}
          rows={(vouchersQuery.data?.data ?? []).map((voucher) => [
            voucher.code,
            voucher.type,
            voucher.type === 'PERCENTAGE' ? `${toNumber(voucher.value)}%` : money(voucher.value),
            `${voucher.usedCount}/${voucher.quota}`,
            money(voucher.minPurchase),
            shortDate(voucher.expiresAt),
          ])}
        />
      </Panel>
      <Panel title="Mint voucher" eyebrow="controlled discount">
        <form className="control-form" onSubmit={form.handleSubmit((values) => createVoucher.mutate(values))}>
          <input {...form.register('code')} placeholder="Code" />
          <select {...form.register('type')}>
            {voucherTypes.map((type: VoucherType) => <option key={type}>{type}</option>)}
          </select>
          <input {...form.register('value')} type="number" placeholder="Value" />
          <input {...form.register('minPurchase')} type="number" placeholder="Minimum purchase" />
          <input {...form.register('maxDiscount')} type="number" placeholder="Max discount" />
          <input {...form.register('quota')} type="number" placeholder="Quota" />
          <input {...form.register('expiresAt')} type="datetime-local" />
          <button className="primary-button" disabled={createVoucher.isPending}><TicketPlus size={17} /> Create voucher</button>
        </form>
      </Panel>
    </div>
  )
}
