'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type {
  CustomerWithCount,
  CreateCustomerValues,
  UpdateCustomerValues,
  CustomerListParams,
  CustomerPage,
} from '@/lib/schemas/customer.schema'

const CUSTOMERS_KEY = 'customers'

export function useCustomers(params: CustomerListParams = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.sortBy) query.set('sortBy', params.sortBy)
  if (params.sortOrder) query.set('sortOrder', params.sortOrder)
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  return useQuery({
    queryKey: [CUSTOMERS_KEY, params],
    queryFn: () => apiFetch<CustomerPage>(`/customers?${query.toString()}`),
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: () => apiFetch<CustomerWithCount>(`/customers/${id}`),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCustomerValues) =>
      apiFetch<CustomerWithCount>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] })
    },
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerValues }) =>
      apiFetch<CustomerWithCount>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess(_, { id }) {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] })
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY, id] })
    },
  })
}

export function useArchiveCustomer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] })
    },
  })
}

export function useReactivateCustomer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<CustomerWithCount>(`/customers/${id}/restore`, {
        method: 'PATCH',
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] })
    },
  })
}
