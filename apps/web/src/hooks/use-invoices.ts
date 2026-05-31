'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type {
  Invoice,
  InvoiceStatus,
  CreateInvoiceValues,
} from '@/lib/schemas/invoice.schema'

export function useWorkOrderInvoice(workOrderId: string) {
  return useQuery({
    queryKey: ['invoices', 'work-order', workOrderId],
    queryFn: () =>
      apiFetch<Invoice>(`/work-orders/${workOrderId}/invoice`).catch(
        () => null
      ),
    enabled: !!workOrderId,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateInvoiceValues) =>
      apiFetch<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess(invoice) {
      qc.invalidateQueries({
        queryKey: ['invoices', 'work-order', invoice.workOrderId],
      })
    },
  })
}

export function useTransitionInvoiceStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: InvoiceStatus
      workOrderId: string
    }) =>
      apiFetch<Invoice>(`/invoices/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess(_, { workOrderId }) {
      qc.invalidateQueries({
        queryKey: ['invoices', 'work-order', workOrderId],
      })
    },
  })
}
