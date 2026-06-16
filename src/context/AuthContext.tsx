import { createContext, useContext, useState } from 'react'
import type { AuthResponse } from '../types'

interface AuthContextValue {
  session: AuthResponse | null
  setSession: (session: AuthResponse) => void
  logout: () => void
}

const storageKey = 'j-commerce-admin-session'
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthResponse | null>(() => readSession())

  function setSession(nextSession: AuthResponse) {
    localStorage.setItem(storageKey, JSON.stringify(nextSession))
    setSessionState(nextSession)
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
    return JSON.parse(raw) as AuthResponse
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}
