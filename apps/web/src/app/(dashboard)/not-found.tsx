import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className='flex flex-col items-center justify-center py-24 gap-4'>
      <p className='text-4xl font-bold text-muted-foreground'>404</p>
      <p className='text-muted-foreground'>Esta página no existe.</p>
      <Button variant='outline' asChild>
        <Link href='/'>Ir al inicio</Link>
      </Button>
    </div>
  )
}
