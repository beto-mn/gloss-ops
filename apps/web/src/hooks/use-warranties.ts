'use client'

import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type { Warranty } from '@/lib/schemas/warranty.schema'

export function useAssetWarranties(assetId: string) {
  return useQuery({
    queryKey: ['warranties', 'asset', assetId],
    queryFn: () =>
      apiFetch<Warranty[]>(`/customer-assets/${assetId}/warranties`),
    enabled: !!assetId,
  })
}

export function useWorkOrderWarranties(workOrderId: string) {
  return useQuery({
    queryKey: ['warranties', 'work-order', workOrderId],
    queryFn: () =>
      apiFetch<Warranty[]>(`/work-orders/${workOrderId}/warranties`),
    enabled: !!workOrderId,
  })
}
