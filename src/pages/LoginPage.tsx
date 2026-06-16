import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL, login } from '../lib/api'
import { readError } from '../lib/format'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { session, setSession } = useAuth()
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@jcommerce.com', password: 'admin123' },
  })

  if (session) return <Navigate to="/" replace />

  async function submit(values: LoginForm) {
    try {
      const nextSession = await login(values.email, values.password)
      if (nextSession.user.role !== 'ADMIN') throw new Error('Akun ini bukan admin')
      setSession(nextSession)
      toast.success(`Welcome back, ${nextSession.user.name}`)
    } catch (error) {
      toast.error(readError(error))
    }
  }

  return (
    <main className="login-scene">
      <motion.section
        className="login-layout"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-poster">
          <span className="eyebrow">single-store command room</span>
          <h1>Run the bazaar like a trading floor.</h1>
          <p>
            Catalog, fulfillment, promo, broadcast, banners, uploads, and revenue telemetry in
            one unapologetically sharp admin surface.
          </p>
          <div className="poster-lines" aria-hidden="true" />
        </div>
        <form className="login-card" onSubmit={form.handleSubmit(submit)}>
          <div>
            <span className="eyebrow">api target</span>
            <code>{API_BASE_URL}</code>
          </div>
          <label>
            Email
            <input {...form.register('email')} />
          </label>
          <label>
            Password
            <input type="password" {...form.register('password')} />
          </label>
          <button className="primary-button" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Entering...' : 'Enter admin'}
          </button>
        </form>
      </motion.section>
    </main>
  )
}
