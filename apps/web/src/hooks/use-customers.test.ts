import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type {
  CustomerPage,
  CustomerWithCount,
} from '@/lib/schemas/customer.schema'

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

describe('useCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useCustomers } = await import('./use-customers')
    const payload: CustomerPage = {
      data: [
        {
          id: 'cust-1',
          organizationId: 'org-1',
          firstName: 'Ana',
          lastName: 'García',
          email: null,
          phone: null,
          address: null,
          taxId: null,
          fiscalRegime: null,
          zipCode: null,
          source: null,
          note: null,
          status: 'ACTIVE',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          activeWorkOrderCount: 0,
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

    const { result } = renderHook(() => useCustomers(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(payload)
  })

  it('sets isError when apiFetch rejects', async () => {
    const { useCustomers } = await import('./use-customers')
    const { ApiError } = await import('@/lib/api-client')
    mockedApiFetch.mockRejectedValueOnce(new ApiError(500, 'Server error'))

    const { result } = renderHook(() => useCustomers(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /customers', async () => {
    const { useCreateCustomer } = await import('./use-customers')
    const created: CustomerWithCount = {
      id: 'cust-new',
      organizationId: 'org-1',
      firstName: 'Beto',
      lastName: 'Najera',
      email: null,
      phone: null,
      address: null,
      taxId: null,
      fiscalRegime: null,
      zipCode: null,
      source: null,
      note: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      activeWorkOrderCount: 0,
    }
    mockedApiFetch.mockResolvedValueOnce(created)

    const { result } = renderHook(() => useCreateCustomer(), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({ firstName: 'Beto', lastName: 'Najera' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/customers',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
