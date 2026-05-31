'use client'

import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import type { ServicePage } from '@/lib/schemas/service.schema'

export function useServices() {
  return useQuery({
    queryKey: ['services', 'active'],
    queryFn: () =>
      apiFetch<ServicePage>('/services?status=ACTIVE&limit=200').then(
        res => res.data
      ),
    staleTime: 5 * 60 * 1000,
  })
}
