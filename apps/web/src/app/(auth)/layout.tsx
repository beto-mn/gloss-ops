export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-dvh flex'>
      {/* Brand panel — desktop only */}
      <div className='hidden md:flex md:w-2/5 relative overflow-hidden flex-col items-center justify-center gap-6 p-12'>
        {/* Gulf livery gradient: orange → blue */}
        <div
          className='absolute inset-0'
          style={{
            background:
              'linear-gradient(160deg, #F06432 0%, #D05020 35%, #0A1520 100%)',
          }}
        />
        {/* Gulf racing stripes — white so they read on both colors */}
        <div
          className='absolute -left-12 -right-12 h-20 bg-white/10'
          style={{ top: '52%', transform: 'rotate(-10deg)' }}
        />
        <div
          className='absolute -left-12 -right-12 h-6 bg-white/8'
          style={{ top: '66%', transform: 'rotate(-10deg)' }}
        />
        <div className='flex flex-col items-center gap-3 text-primary-foreground relative z-10'>
          <svg
            width='48'
            height='48'
            viewBox='0 0 48 48'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            aria-hidden='true'
          >
            <rect
              width='48'
              height='48'
              rx='12'
              fill='white'
              fillOpacity='0.2'
            />
            <path
              d='M12 24C12 17.373 17.373 12 24 12C30.627 12 36 17.373 36 24V32H24C17.373 32 12 26.627 12 20V24Z'
              fill='white'
            />
          </svg>
          <span className='text-2xl font-bold tracking-tight'>GlossOps</span>
          <p className='text-lg font-medium text-center text-primary-foreground/80'>
            Operaciones de taller en un solo lugar.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className='flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-accent/20'>
        {children}
      </div>
    </div>
  )
}
