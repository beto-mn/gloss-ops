'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type {
  CustomerAsset,
  CustomerAssetPage,
  CreateVehicleValues,
  UpdateVehicleValues,
} from '@/lib/schemas/customer-asset.schema'

const ASSETS_KEY = 'customer-assets'

export function useCustomerAssets(customerId: string) {
  return useQuery({
    queryKey: [ASSETS_KEY, customerId],
    queryFn: () =>
      apiFetch<CustomerAssetPage>(`/customers/${customerId}/assets`),
    enabled: !!customerId,
  })
}

export function useCreateAsset(customerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVehicleValues) =>
      apiFetch<CustomerAsset>(`/customers/${customerId}/assets`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [ASSETS_KEY, customerId] })
    },
  })
}

export function useUpdateAsset(customerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleValues }) =>
      apiFetch<CustomerAsset>(`/customers/${customerId}/assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [ASSETS_KEY, customerId] })
    },
  })
}

export function useDeleteAsset(customerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/customers/${customerId}/assets/${id}`, {
        method: 'DELETE',
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: [ASSETS_KEY, customerId] })
    },
  })
}
