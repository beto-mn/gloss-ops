'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type { WorkOrderAssignment } from '@/lib/schemas/work-order.schema'

export function useWorkOrderAssignments(workOrderId: string) {
  return useQuery({
    queryKey: ['work-order-assignments', workOrderId],
    queryFn: () =>
      apiFetch<WorkOrderAssignment[]>(
        `/work-orders/${workOrderId}/assignments`
      ),
    enabled: !!workOrderId,
  })
}

export function useAssignTechnician(workOrderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: { accountId: string; role: 'LEAD' | 'ASSISTANT' }) =>
      apiFetch<WorkOrderAssignment>(`/work-orders/${workOrderId}/assignments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess() {
      qc.invalidateQueries({
        queryKey: ['work-order-assignments', workOrderId],
      })
    },
  })
}

export function useUnassignTechnician(workOrderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch<void>(
        `/work-orders/${workOrderId}/assignments/${assignmentId}`,
        { method: 'DELETE' }
      ),
    onSuccess() {
      qc.invalidateQueries({
        queryKey: ['work-order-assignments', workOrderId],
      })
    },
  })
}
