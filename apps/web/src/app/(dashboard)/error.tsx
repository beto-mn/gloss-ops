'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className='flex flex-col items-center justify-center py-24 gap-4'>
      <p className='text-muted-foreground'>Ocurrió un error inesperado.</p>
      <div className='flex gap-3'>
        <Button variant='outline' onClick={reset}>
          Intentar de nuevo
        </Button>
        <Button variant='outline' asChild>
          <Link href='/'>Ir al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
