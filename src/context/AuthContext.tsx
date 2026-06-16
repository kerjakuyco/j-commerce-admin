import { createContext, useContext, useEffect, useState } from 'react'
import type { AuthResponse } from '../types'

interface AuthContextValue {
  session: AuthResponse | null
  setSession: (session: AuthResponse) => void
  logout: () => void
}

const storageKey = 'j-commerce-admin-session'
const AuthContext = createContext<AuthContextValue | null>(null)

type StoredSession = AuthResponse & { expiresAt: number }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthResponse | null>(() => readSession())

  useEffect(() => {
    if (!session) return undefined
    const expiresAt = (session as StoredSession).expiresAt
    if (!expiresAt) return undefined
    const delay = expiresAt - Date.now()
    if (delay <= 0) {
      logout()
      return undefined
    }
    const timeout = window.setTimeout(logout, delay)
    return () => window.clearTimeout(timeout)
  }, [session])

  function setSession(nextSession: AuthResponse) {
    const storedSession: StoredSession = {
      ...nextSession,
      expiresAt: Date.now() + nextSession.expiresIn * 1000,
    }
    localStorage.setItem(storageKey, JSON.stringify(storedSession))
    setSessionState(storedSession)
  }

  function logout() {
    localStorage.removeItem(storageKey)
    setSessionState(null)
  }

  return (
    <AuthContext.Provider value={{ session, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function useToken() {
  const { session } = useAuth()
  if (!session) throw new Error('Missing admin session')
  return session.accessToken
}

function readSession() {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isStoredSession(parsed) || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(storageKey)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const user = record.user as Record<string, unknown> | undefined
  return (
    typeof record.accessToken === 'string' &&
    typeof record.refreshToken === 'string' &&
    typeof record.expiresIn === 'number' &&
    typeof record.expiresAt === 'number' &&
    !!user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    user.role === 'ADMIN'
  )
}
