import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { I18nProvider } from './context/I18nContext.tsx'
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx'
import { ApiError } from './lib/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Retry once for transient failures, but never stall on a 401 — the
      // unauthorized handler in AuthContext already clears the session.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status === 401) && failureCount < 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
              <ThemedToaster />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster richColors position="top-right" theme={theme} />
}
