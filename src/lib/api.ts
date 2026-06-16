import type { AuthResponse } from '../types'

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

export const API_BASE_URL = (configuredBaseUrl || 'http://localhost:3000/api/v1').replace(
  /\/+$/,
  '',
)

type ApiOptions = RequestInit & {
  token?: string
  skipJson?: boolean
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, skipJson, headers: inputHeaders, ...init } = options
  const headers = new Headers(inputHeaders)

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), { ...init, headers })
  const text = await response.text()
  if (!response.ok) {
    const body = text ? parseJson(text) : text
    throw new ApiError(readApiMessage(body, response.statusText), response.status)
  }

  if (skipJson || text.length === 0) {
    return undefined as T
  }

  const body = parseJson(text)
  if (!body || typeof body !== 'object') {
    throw new ApiError('Unexpected response format', response.status)
  }

  return body as T
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
}

export function refreshTokens(refreshToken: string) {
  return request<Pick<AuthResponse, 'accessToken' | 'refreshToken' | 'expiresIn'>>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function readApiMessage(body: unknown, fallback: string) {
  if (typeof body === 'string') return body
  if (!body || typeof body !== 'object') return fallback
  const record = body as Record<string, unknown>
  if (Array.isArray(record.message)) return record.message.join(', ')
  if (typeof record.message === 'string') return record.message
  if (typeof record.error === 'string') return record.error
  return fallback
}
