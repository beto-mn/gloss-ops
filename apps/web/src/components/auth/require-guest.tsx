'use client'

import { startTransition, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getAccessToken } from '@/lib/api-client'

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/dashboard')
    } else {
      startTransition(() => setReady(true))
    }
  }, [router])

  if (!ready) return null

  return <>{children}</>
}
