'use client'

import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'

export interface OrgMember {
  id: string
  role: string
  account: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => apiFetch<OrgMember[]>('/organizations/me/members'),
    staleTime: 5 * 60 * 1000,
  })
}
