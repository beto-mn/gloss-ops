import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { ServicePage } from '@/lib/schemas/service.schema'

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

describe('useServicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useServicesPage } = await import('./use-services')
    const payload: ServicePage = {
      data: [
        {
          id: 'svc-1',
          name: 'Pulido',
          description: null,
          basePrice: 500,
          warrantyDays: 30,
          isActive: true,
          claveProdServ: null,
          claveUnidad: null,
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    }
    mockedApiFetch.mockResolvedValueOnce(payload)

    const { result } = renderHook(() => useServicesPage(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(payload)
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useServicesPage } = await import('./use-services')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(500, 'Server error'))

    const { result } = renderHook(() => useServicesPage(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /services', async () => {
    const { useCreateService } = await import('./use-services')
    mockedApiFetch.mockResolvedValueOnce({ id: 'svc-new', name: 'Pulido' })

    const { result } = renderHook(() => useCreateService(), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({ name: 'Pulido', basePrice: 500 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/services',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
