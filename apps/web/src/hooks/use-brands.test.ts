import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
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

describe('useBrands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns sorted brands when apiFetch resolves', async () => {
    const { useBrands } = await import('./use-brands')
    const payload = {
      data: [
        {
          id: 'b-2',
          name: 'Toyota',
          slug: 'toyota',
          category: 'VEHICLE',
          logoUrl: null,
        },
        {
          id: 'b-1',
          name: 'BMW',
          slug: 'bmw',
          category: 'VEHICLE',
          logoUrl: null,
        },
      ],
      meta: { total: 2 },
    }
    mockedApiFetch.mockResolvedValueOnce(payload)

    const { result } = renderHook(() => useBrands(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // useBrands sorts alphabetically by name
    expect(result.current.data![0].name).toBe('BMW')
    expect(result.current.data![1].name).toBe('Toyota')
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useBrands } = await import('./use-brands')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(500, 'Server error'))

    const { result } = renderHook(() => useBrands(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
