'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import {
  apiFetch,
  setTokens,
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

export function useLogin() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: LoginFormValues) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess(data) {
      setTokens(data.accessToken, data.refreshToken)
      router.push('/dashboard')
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
    onSuccess(data) {
      setTokens(data.accessToken, data.refreshToken)
      router.push('/dashboard')
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
      router.push('/login')
    },
  })
}
