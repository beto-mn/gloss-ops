'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type {
  Service,
  ServicePage,
  ServiceListParams,
  CreateServiceValues,
  UpdateServiceValues,
} from '@/lib/schemas/service.schema'

const SVC_KEY = 'services'

export function useServices(params: ServiceListParams = {}) {
  const query = new URLSearchParams()
  if (params.includeInactive) query.set('includeInactive', 'true')
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  return useQuery({
    queryKey: [SVC_KEY, params],
    queryFn: () =>
      apiFetch<ServicePage>(`/services?${query.toString()}`).then(
        res => res.data
      ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useServicesPage(params: ServiceListParams = {}) {
  const query = new URLSearchParams()
  if (params.includeInactive) query.set('includeInactive', 'true')
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  return useQuery({
    queryKey: [SVC_KEY, 'page', params],
    queryFn: () => apiFetch<ServicePage>(`/services?${query.toString()}`),
  })
}

export function useService(id: string) {
  return useQuery({
    queryKey: [SVC_KEY, id],
    queryFn: () => apiFetch<Service>(`/services/${id}`),
    enabled: !!id,
  })
}

export function useCreateService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateServiceValues) =>
      apiFetch<Service>('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [SVC_KEY] })
    },
  })
}

export function useUpdateService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceValues }) =>
      apiFetch<Service>(`/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess(_, { id }) {
      qc.invalidateQueries({ queryKey: [SVC_KEY] })
      qc.invalidateQueries({ queryKey: [SVC_KEY, id] })
    },
  })
}

export function useActivateService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Service>(`/services/${id}/activate`, { method: 'POST' }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [SVC_KEY] })
    },
  })
}

export function useDeactivateService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Service>(`/services/${id}/deactivate`, { method: 'POST' }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [SVC_KEY] })
    },
  })
}

export function useDeleteService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/services/${id}`, { method: 'DELETE' }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [SVC_KEY] })
    },
  })
}
