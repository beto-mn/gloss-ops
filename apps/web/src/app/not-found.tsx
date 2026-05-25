import Link from 'next/link'

export default function GlobalNotFound() {
  return (
    <div className='flex min-h-dvh items-center justify-center'>
      <div className='flex flex-col items-center gap-4'>
        <p className='text-4xl font-bold text-muted-foreground'>404</p>
        <p className='text-muted-foreground'>Esta página no existe.</p>
        <Link
          href='/'
          className='text-sm underline text-muted-foreground hover:text-foreground'
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
