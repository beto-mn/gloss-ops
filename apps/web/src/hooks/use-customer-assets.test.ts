import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { CustomerAssetPage } from '@/lib/schemas/customer-asset.schema'

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

describe('useCustomerAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useCustomerAssets } = await import('./use-customer-assets')
    const payload: CustomerAssetPage = {
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

    const { result } = renderHook(() => useCustomerAssets('cust-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(payload)
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useCustomerAssets } = await import('./use-customer-assets')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(500, 'Server error'))

    const { result } = renderHook(() => useCustomerAssets('cust-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /customers/:id/assets', async () => {
    const { useCreateAsset } = await import('./use-customer-assets')
    const { AssetType } = await import('@glossops/shared')
    mockedApiFetch.mockResolvedValueOnce({ id: 'asset-new' })

    const { result } = renderHook(() => useCreateAsset('cust-1'), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({
      assetType: AssetType.VEHICLE,
      brandId: '00000000-0000-0000-0000-000000000001',
      model: 'Civic',
      identifier: 'ABC-123',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/customers/cust-1/assets',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
