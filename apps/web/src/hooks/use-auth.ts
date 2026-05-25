'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import {
  apiFetch,
  setTokens,
  setOrganizationId,
  setUserRole,
  clearTokens,
  getRefreshToken,
} from '@/lib/api-client'
import type {
  LoginFormValues,
  RegisterFormValues,
} from '@/lib/schemas/auth.schema'

interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface OrganizationWithRole {
  id: string
  name: string
  role: string
}

async function storeOrgAfterAuth(tokens: AuthResponse): Promise<void> {
  setTokens(tokens.accessToken, tokens.refreshToken)
  try {
    const orgs = await apiFetch<OrganizationWithRole[]>('/organizations')
    if (orgs.length > 0) {
      setOrganizationId(orgs[0].id)
      setUserRole(orgs[0].role)
    }
  } catch {
    // non-blocking — org ID and role can be retried on next load
  }
}

export function useLogin() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: LoginFormValues) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    async onSuccess(data) {
      await storeOrgAfterAuth(data)
      router.replace('/')
    },
  })
}

export function useRegister() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: Omit<RegisterFormValues, 'confirmPassword'>) =>
      apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    async onSuccess(data) {
      await storeOrgAfterAuth(data)
      router.replace('/')
    },
  })
}

export function useLogout() {
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken()
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
      } catch {
        // optimistic sign out — clear regardless
      }
    },
    onSettled() {
      clearTokens()
      router.replace('/login')
    },
  })
}
