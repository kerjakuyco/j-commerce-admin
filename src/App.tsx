import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingState } from './components/LoadingState'
import { Shell } from './components/Shell'
import { useAuth } from './context/AuthContext'
import { useI18n } from './context/I18nContext'

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })))
const CatalogPage = lazy(() => import('./pages/CatalogPage').then((module) => ({ default: module.CatalogPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const VouchersPage = lazy(() => import('./pages/VouchersPage').then((module) => ({ default: module.VouchersPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const BannersPage = lazy(() => import('./pages/BannersPage').then((module) => ({ default: module.BannersPage })))
const UploadPage = lazy(() => import('./pages/UploadPage').then((module) => ({ default: module.UploadPage })))

function App() {
  const { t } = useI18n()
  return (
    <Suspense fallback={<LoadingState label={t.app.loading} />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="upload" element={<UploadPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function ProtectedShell() {
  const { session } = useAuth()
  if (!session || session.user.role !== 'ADMIN') return <Navigate to="/login" replace />
  return <Shell />
}

export default App
