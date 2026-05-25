'use client'

import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'

export interface Brand {
  id: string
  name: string
  slug: string
  category: string
  logoUrl: string | null
}

interface BrandPage {
  data: Brand[]
  meta: { total: number }
}

export function useBrands(category?: string, enabled = true) {
  const query = new URLSearchParams({ limit: '200' })
  if (category) query.set('category', category)

  return useQuery({
    queryKey: ['brands', category ?? 'all'],
    queryFn: () =>
      apiFetch<BrandPage>(`/brands?${query.toString()}`).then(res =>
        [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'es'))
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
