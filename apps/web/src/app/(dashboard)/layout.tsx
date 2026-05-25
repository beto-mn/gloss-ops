import { RequireAuth } from '@/components/auth/require-auth'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-dvh'>
      {/* Desktop sidebar */}
      <div className='hidden lg:flex lg:shrink-0'>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className='flex flex-1 flex-col min-w-0'>
        <Header />
        <main className='flex-1 overflow-y-auto p-4 lg:p-6'>
          <RequireAuth>{children}</RequireAuth>
        </main>
      </div>
    </div>
  )
}
