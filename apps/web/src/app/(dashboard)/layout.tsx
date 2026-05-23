import { RequireAuth } from '@/components/auth/require-auth'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <div className='flex min-h-dvh'>
        {/* Desktop sidebar */}
        <div className='hidden lg:flex lg:shrink-0'>
          <Sidebar />
        </div>

        {/* Main content */}
        <div className='flex flex-1 flex-col min-w-0'>
          <Header />
          <main className='flex-1 overflow-y-auto p-6'>{children}</main>
        </div>
      </div>
    </RequireAuth>
  )
}
