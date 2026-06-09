'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { WorkOrderStatus } from '@glossops/shared'

import { apiFetch } from '@/lib/api-client'
import type {
  WorkOrderDetail,
  WorkOrderPage,
  WorkOrderListParams,
  CreateWorkOrderValues,
  UpdateWorkOrderValues,
} from '@/lib/schemas/work-order.schema'

const WO_KEY = 'work-orders'

export function useWorkOrders(params: WorkOrderListParams = {}) {
  const query = new URLSearchParams()
  if (params.status && params.status !== 'ALL')
    query.set('status', params.status)
  if (params.assetId) query.set('assetId', params.assetId)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  return useQuery({
    queryKey: [WO_KEY, params],
    queryFn: () => apiFetch<WorkOrderPage>(`/work-orders?${query.toString()}`),
  })
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: [WO_KEY, id],
    queryFn: () => apiFetch<WorkOrderDetail>(`/work-orders/${id}`),
    enabled: !!id,
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkOrderValues) =>
      apiFetch<WorkOrderDetail>('/work-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [WO_KEY] })
    },
  })
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkOrderValues }) =>
      apiFetch<WorkOrderDetail>(`/work-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess(_, { id }) {
      qc.invalidateQueries({ queryKey: [WO_KEY] })
      qc.invalidateQueries({ queryKey: [WO_KEY, id] })
    },
  })
}

export function useTransitionWorkOrderStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrderStatus }) =>
      apiFetch<WorkOrderDetail>(`/work-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess(_, { id }) {
      qc.invalidateQueries({ queryKey: [WO_KEY] })
      qc.invalidateQueries({ queryKey: [WO_KEY, id] })
    },
  })
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/work-orders/${id}`, { method: 'DELETE' }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [WO_KEY] })
    },
  })
}
