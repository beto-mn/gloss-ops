import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { Warranty } from '@/lib/schemas/warranty.schema'

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

const mockWarranty: Warranty = {
  id: 'w-1',
  workOrderItemId: 'item-1',
  serviceId: 'svc-1',
  serviceName: 'Pulido',
  description: 'Garantía de pulido',
  term: '30 días',
  validFrom: '2026-01-01',
  validUntil: '2026-01-31',
  isVoid: false,
  voidReason: null,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('useAssetWarranties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useAssetWarranties } = await import('./use-warranties')
    mockedApiFetch.mockResolvedValueOnce([mockWarranty])

    const { result } = renderHook(() => useAssetWarranties('asset-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockWarranty])
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useAssetWarranties } = await import('./use-warranties')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(404, 'Not found'))

    const { result } = renderHook(() => useAssetWarranties('asset-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useWorkOrderWarranties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useWorkOrderWarranties } = await import('./use-warranties')
    mockedApiFetch.mockResolvedValueOnce([mockWarranty])

    const { result } = renderHook(() => useWorkOrderWarranties('wo-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockWarranty])
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useWorkOrderWarranties } = await import('./use-warranties')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(500, 'Server error'))

    const { result } = renderHook(() => useWorkOrderWarranties('wo-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
