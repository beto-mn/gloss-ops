import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { WorkOrderCheckpoint } from '@/lib/schemas/work-order.schema'

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

const mockCheckpoint: WorkOrderCheckpoint = {
  id: 'cp-1',
  type: 'RECEPTION',
  processType: null,
  generalCondition: 'GOOD',
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('useCheckpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useCheckpoints } = await import('./use-checkpoints')
    mockedApiFetch.mockResolvedValueOnce([mockCheckpoint])

    const { result } = renderHook(() => useCheckpoints('wo-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockCheckpoint])
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useCheckpoints } = await import('./use-checkpoints')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(500, 'Server error'))

    const { result } = renderHook(() => useCheckpoints('wo-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateCheckpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /work-orders/:id/checkpoints', async () => {
    const { useCreateCheckpoint } = await import('./use-checkpoints')
    mockedApiFetch.mockResolvedValueOnce(mockCheckpoint)

    const { result } = renderHook(() => useCreateCheckpoint('wo-1'), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({
      type: 'RECEPTION',
      generalCondition: 'GOOD',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/work-orders/wo-1/checkpoints',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
