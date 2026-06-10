import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { WorkOrderAssignment } from '@/lib/schemas/work-order.schema'

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

const mockAssignment: WorkOrderAssignment = {
  id: 'asgn-1',
  memberId: 'mem-1',
  accountId: 'acc-1',
  role: 'LEAD',
  account: {
    id: 'acc-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@taller.com',
  },
  assignedAt: '2026-01-01T00:00:00Z',
}

describe('useAssignTechnician', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with POST /work-orders/:id/assignments', async () => {
    const { useAssignTechnician } = await import('./use-work-order-assignments')
    mockedApiFetch.mockResolvedValueOnce(mockAssignment)

    const { result } = renderHook(() => useAssignTechnician('wo-1'), {
      wrapper: makeWrapper(),
    })
    result.current.mutate({ memberId: 'mem-1', role: 'LEAD' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/work-orders/wo-1/assignments',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('useUnassignTechnician', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiFetch with DELETE /work-orders/:id/assignments/:assignmentId', async () => {
    const { useUnassignTechnician } =
      await import('./use-work-order-assignments')
    mockedApiFetch.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useUnassignTechnician('wo-1'), {
      wrapper: makeWrapper(),
    })
    result.current.mutate('asgn-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/work-orders/wo-1/assignments/asgn-1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
