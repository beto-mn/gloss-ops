'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type { WorkOrderCheckpoint } from '@/lib/schemas/work-order.schema'

export function useCheckpoints(workOrderId: string) {
  return useQuery({
    queryKey: ['checkpoints', workOrderId],
    queryFn: () =>
      apiFetch<WorkOrderCheckpoint[]>(
        `/work-orders/${workOrderId}/checkpoints`
      ),
    enabled: !!workOrderId,
  })
}

export function useCreateCheckpoint(workOrderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      type: 'RECEPTION' | 'PROCESS' | 'DELIVERY'
      processType?: string
      generalCondition: string
      note?: string
    }) =>
      apiFetch<WorkOrderCheckpoint>(`/work-orders/${workOrderId}/checkpoints`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['checkpoints', workOrderId] })
    },
  })
}

export function useUpdateCheckpoint(workOrderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { note?: string } }) =>
      apiFetch<WorkOrderCheckpoint>(
        `/work-orders/${workOrderId}/checkpoints/${id}`,
        { method: 'PATCH', body: JSON.stringify(data) }
      ),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['checkpoints', workOrderId] })
    },
  })
}

export function useDeleteCheckpoint(workOrderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/work-orders/${workOrderId}/checkpoints/${id}`, {
        method: 'DELETE',
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['checkpoints', workOrderId] })
    },
  })
}
