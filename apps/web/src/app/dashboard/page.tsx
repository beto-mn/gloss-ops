'use client'

import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { RequireAuth } from '@/components/auth/require-auth'
import { useLogout } from '@/hooks/use-auth'

export default function DashboardPage() {
  const logout = useLogout()

  return (
    <RequireAuth>
      <div className='flex min-h-dvh items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <p className='text-muted-foreground text-sm'>
            Dashboard — próximamente
          </p>
          <Button
            variant='outline'
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut size={16} strokeWidth={1.5} />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </RequireAuth>
  )
}
