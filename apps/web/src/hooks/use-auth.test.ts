import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
  setTokens: vi.fn(),
  setOrganizationId: vi.fn(),
  setUserRole: vi.fn(),
  clearTokens: vi.fn(),
  getRefreshToken: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, msg?: string) {
      super(msg ?? `API error ${status}`)
      this.status = status
      this.name = 'ApiError'
    }
  },
}))

import { apiFetch } from '@/lib/api-client'

const mockedApiFetch = apiFetch as ReturnType<typeof vi.fn>

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
  return Wrapper
}

const mockAuthResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
}

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /auth/login', async () => {
    const { useLogin } = await import('./use-auth')
    // First call: login, second: /organizations
    mockedApiFetch
      .mockResolvedValueOnce(mockAuthResponse)
      .mockResolvedValueOnce([{ id: 'org-1', name: 'Taller', role: 'ADMIN' }])

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'ana@taller.com', password: 'password123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('sets isError when login fails', async () => {
    const { useLogin } = await import('./use-auth')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(401, 'Unauthorized'))

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'bad@test.com', password: 'wrong' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /auth/register', async () => {
    const { useRegister } = await import('./use-auth')
    mockedApiFetch
      .mockResolvedValueOnce(mockAuthResponse)
      .mockResolvedValueOnce([{ id: 'org-1', name: 'Taller', role: 'ADMIN' }])

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({
      name: 'Ana García',
      email: 'ana@taller.com',
      orgName: 'Mi Taller',
      password: 'password123',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /auth/logout', async () => {
    const { useLogout } = await import('./use-auth')
    mockedApiFetch.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/auth/logout',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
