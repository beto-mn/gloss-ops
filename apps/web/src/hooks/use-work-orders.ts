'use client'

import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type { WorkOrderPage } from '@/lib/schemas/work-order.schema'

export function useWorkOrders({ assetId }: { assetId?: string }) {
  const query = new URLSearchParams()
  if (assetId) query.set('assetId', assetId)

  return useQuery({
    queryKey: ['work-orders', { assetId }],
    queryFn: () => apiFetch<WorkOrderPage>(`/work-orders?${query.toString()}`),
    enabled: !!assetId,
  })
}
