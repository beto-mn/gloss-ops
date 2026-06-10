import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { Invoice } from '@/lib/schemas/invoice.schema'

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

const mockInvoice: Invoice = {
  id: 'inv-1',
  folio: 'INV-001',
  workOrderId: 'wo-1',
  subtotal: 1000,
  tax: 160,
  total: 1160,
  status: 'DRAFT' as Invoice['status'],
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('useWorkOrderInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when apiFetch resolves', async () => {
    const { useWorkOrderInvoice } = await import('./use-invoices')
    mockedApiFetch.mockResolvedValueOnce(mockInvoice)

    const { result } = renderHook(() => useWorkOrderInvoice('wo-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockInvoice)
  })
})

describe('useCreateInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /invoices', async () => {
    const { useCreateInvoice } = await import('./use-invoices')
    mockedApiFetch.mockResolvedValueOnce(mockInvoice)

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({
      workOrderId: 'wo-1',
      subtotal: 1000,
      tax: 160,
      total: 1160,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/invoices',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
