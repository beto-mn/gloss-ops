import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { WorkOrderPage } from '@/lib/schemas/work-order.schema'

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

describe('useWorkOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useWorkOrders } = await import('./use-work-orders')
    const payload: WorkOrderPage = {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    }
    mockedApiFetch.mockResolvedValueOnce(payload)

    const { result } = renderHook(() => useWorkOrders(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(payload)
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useWorkOrders } = await import('./use-work-orders')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(500, 'Server error'))

    const { result } = renderHook(() => useWorkOrders(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUpdateWorkOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with PATCH /work-orders/:id', async () => {
    const { useUpdateWorkOrder } = await import('./use-work-orders')
    mockedApiFetch.mockResolvedValueOnce({ id: 'wo-1' })

    const { result } = renderHook(() => useUpdateWorkOrder(), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({ id: 'wo-1', data: { note: 'Updated' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/work-orders/wo-1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})
