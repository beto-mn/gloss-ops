const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const ACCESS_TOKEN_KEY = 'gloss_access_token'
const REFRESH_TOKEN_KEY = 'gloss_refresh_token'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function redirectToLogin(): void {
  clearTokens()
  window.location.href = '/login'
}

let isRefreshing = false

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return false

    const data = (await res.json()) as {
      accessToken: string
      refreshToken: string
    }
    setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const accessToken = getAccessToken()

  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (res.status !== 401) {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const typed = body as { message?: string; error?: string }
      throw new ApiError(res.status, typed.error ?? typed.message)
    }
    return res.json() as Promise<T>
  }

  // 401 path — only attempt refresh if a refresh token exists
  if (!getRefreshToken()) {
    const body = await res.json().catch(() => ({}))
    const typed = body as { message?: string; error?: string }
    throw new ApiError(401, typed.error ?? typed.message ?? 'Unauthorized')
  }

  if (isRefreshing) {
    redirectToLogin()
    return Promise.reject(new ApiError(401, 'Session expired'))
  }

  isRefreshing = true
  const refreshed = await tryRefresh()
  isRefreshing = false

  if (!refreshed) {
    redirectToLogin()
    return Promise.reject(new ApiError(401, 'Session expired'))
  }

  // Retry original request with new token
  const newToken = getAccessToken()
  headers.set('Authorization', `Bearer ${newToken}`)
  const retryRes = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (!retryRes.ok) {
    const body = await retryRes.json().catch(() => ({}))
    const typed = body as { message?: string; error?: string }
    throw new ApiError(retryRes.status, typed.error ?? typed.message)
  }

  return retryRes.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message?: string
  ) {
    super(message ?? `API error ${status}`)
    this.name = 'ApiError'
  }
}
