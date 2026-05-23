'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getAccessToken } from '@/lib/api-client'

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    if (getAccessToken()) {
      router.replace('/')
    }
  }, [router])

  if (mounted && getAccessToken()) return null

  return <>{children}</>
}
