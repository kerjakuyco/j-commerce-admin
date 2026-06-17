import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { refreshTokens, setUnauthorizedHandler } from '../lib/api'
import type { AuthResponse } from '../types'

interface AuthContextValue {
  session: AuthResponse | null
  setSession: (session: AuthResponse) => void
  logout: () => void
}

const storageKey = 'j-commerce-admin-session'
const REFRESH_BUFFER_MS = 60_000
const AuthContext = createContext<AuthContextValue | null>(null)

type StoredSession = AuthResponse & { expiresAt: number }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthResponse | null>(() => readSession())
  const refreshTimeoutRef = useRef<number | undefined>(undefined)
  // AbortController for any in-flight token refresh, so logout can cancel it.
  const refreshAbortRef = useRef<AbortController | null>(null)
  // Set true by logout() so a late-refresh resolution bails before setSession.
  const isLoggedOutRef = useRef(false)
  // Mirror of `session` readable inside async callbacks without re-subscribing.
  const sessionRef = useRef<AuthResponse | null>(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const logout = useCallback(() => {
    isLoggedOutRef.current = true
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = undefined
    }
    refreshAbortRef.current?.abort()
    refreshAbortRef.current = null
    localStorage.removeItem(storageKey)
    setSessionState(null)
  }, [])

  const setSession = useCallback((nextSession: AuthResponse) => {
    isLoggedOutRef.current = false
    const exp = decodeJwtExp(nextSession.accessToken)
    const storedSession: StoredSession = {
      ...nextSession,
      expiresAt: exp ?? Date.now() + nextSession.expiresIn * 1000,
    }
    localStorage.setItem(storageKey, JSON.stringify(storedSession))
    setSessionState(storedSession)
  }, [])

  // Treat any 401 from the API as "session is dead" and tear down locally.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (!session) {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = undefined
      }
      return undefined
    }

    const expiresAt = (session as StoredSession).expiresAt
    if (!expiresAt) return undefined

    const scheduleRefresh = () => {
      const delay = Math.max(0, expiresAt - Date.now() - REFRESH_BUFFER_MS)
      refreshTimeoutRef.current = window.setTimeout(async () => {
        if (isLoggedOutRef.current) return
        const currentSession = sessionRef.current
        if (!currentSession) return
        const controller = new AbortController()
        refreshAbortRef.current = controller
        try {
          const next = await refreshTokens(currentSession.refreshToken, {
            signal: controller.signal,
          })
          // Bail if logout ran, or the refresh was cancelled, while we awaited.
          if (isLoggedOutRef.current || controller.signal.aborted) return
          // Re-read the latest session in case setSession ran during the await.
          const latest = sessionRef.current
          if (!latest || !next) {
            logout()
            return
          }
          setSession({ ...latest, ...next })
        } catch {
          if (!isLoggedOutRef.current) logout()
        } finally {
          if (refreshAbortRef.current === controller) refreshAbortRef.current = null
        }
      }, delay)
    }

    scheduleRefresh()
    return () => window.clearTimeout(refreshTimeoutRef.current)
  }, [session, logout, setSession])

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
    if (!isStoredSession(parsed)) {
      localStorage.removeItem(storageKey)
      return null
    }
    const exp = decodeJwtExp(parsed.accessToken)
    const expiresAt = exp ?? parsed.expiresAt
    if (expiresAt <= Date.now()) {
      localStorage.removeItem(storageKey)
      return null
    }
    return { ...parsed, expiresAt }
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

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    // atob returns a binary string (Latin-1 code units). Convert to bytes and
    // decode as UTF-8 so payloads containing non-ASCII claims parse correctly.
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const json = new TextDecoder('utf-8').decode(bytes)
    const parsed = JSON.parse(json) as Record<string, unknown>
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null
  } catch {
    return null
  }
}