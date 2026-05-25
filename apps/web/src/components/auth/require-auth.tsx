'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getAccessToken } from '@/lib/api-client'

// useLayoutEffect fires before the browser paints so the redirect happens
// without a visible flash. On the server useLayoutEffect is not available,
// so we fall back to useEffect (which doesn't run at all during SSR).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // mounted starts false so the server and first client paint both render
  // children — no hydration mismatch. After mount we can safely check
  // localStorage and hide content for unauthenticated users.
  const [mounted, setMounted] = useState(false)

  useIsomorphicLayoutEffect(() => {
    setMounted(true)
    if (!getAccessToken()) {
      router.replace('/login')
    }
  }, [])

  // Only hide content after mount confirms there is no token.
  // Before mount (SSR + first client frame) always render to avoid mismatch.
  if (mounted && !getAccessToken()) return null

  return <>{children}</>
}
