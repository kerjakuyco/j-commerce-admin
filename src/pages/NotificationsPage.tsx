import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Radio } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Panel } from '../components/Panel'
import { useToken } from '../context/AuthContext'
import { notificationTypes } from '../lib/constants'
import { request } from '../lib/api'
import { readError } from '../lib/format'
import type { NotificationType } from '../types'

const notificationSchema = z.object({
  type: z.enum(['PROMO', 'ORDER', 'SYSTEM']),
  title: z.string().min(3),
  body: z.string().min(8),
})

type NotificationForm = z.infer<typeof notificationSchema>

export function NotificationsPage() {
  const token = useToken()
  const form = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { type: 'SYSTEM', title: '', body: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: NotificationForm) =>
      request('/notifications/broadcast', {
        token,
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      form.reset({ type: 'SYSTEM', title: '', body: '' })
      toast.success('Broadcast sent')
    },
    onError: (error) => toast.error(readError(error)),
  })

  return (
    <div className="split-layout">
      <Panel title="Signal cannon" eyebrow="broadcast">
        <form className="control-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <label>
            Type
            <select {...form.register('type')}>
              {notificationTypes.map((type: NotificationType) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Title
            <input {...form.register('title')} placeholder="Flash Sale Dimulai" />
          </label>
          <label>
            Message
            <textarea {...form.register('body')} placeholder="Write the broadcast body..." />
          </label>
          <button className="primary-button" disabled={mutation.isPending}>
            <Radio size={17} /> {mutation.isPending ? 'Sending...' : 'Send broadcast'}
          </button>
        </form>
      </Panel>
      <Panel title="Delivery note" eyebrow="operator guidance">
        <p className="copy-block">
          Broadcast creates a global notification (`userId: null`). User-specific order signals are
          created automatically by order status and payment changes from the API.
        </p>
      </Panel>
    </div>
  )
}
