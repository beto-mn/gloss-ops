'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/sidebar'
import { useLogout } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Clientes',
  '/work-orders': 'Órdenes de trabajo',
  '/inventory': 'Inventario',
  '/services': 'Servicios',
  '/activity-log': 'Actividad',
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  const match = Object.entries(ROUTE_LABELS).find(
    ([key]) => key !== '/' && pathname.startsWith(key)
  )
  return match?.[1] ?? 'GlossOps'
}

function getInitials(email?: string | null): string {
  if (!email) return 'G'
  const [local] = email.split('@')
  const parts = local.split(/[._-]/)
  return parts
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
}

function decodeJwtEmail(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('gloss_access_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return (payload as { email?: string }).email ?? null
  } catch {
    return null
  }
}

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const logout = useLogout()

  const [mounted, setMounted] = useState(false)
  // Defer all client-only values to after mount to avoid hydration mismatches
  const [initials, setInitials] = useState('G')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    setInitials(getInitials(decodeJwtEmail()))
  }, [])

  // isDark must be false until mounted — avoids server/client hydration mismatch
  const isDark = mounted && theme === 'dark'

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center gap-3',
        'bg-background border-b border-border px-4'
      )}
    >
      {/* Mobile hamburger */}
      <Button
        variant='ghost'
        size='icon'
        className='lg:hidden shrink-0'
        onClick={() => setSheetOpen(true)}
        aria-label='Abrir menú'
      >
        <Menu size={18} strokeWidth={1.5} />
      </Button>

      {/* Page title */}
      <h1 className='flex-1 text-sm font-semibold text-foreground truncate'>
        {getPageTitle(pathname)}
      </h1>

      {/* Theme toggle */}
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDark ? (
          <Sun size={18} strokeWidth={1.5} />
        ) : (
          <Moon size={18} strokeWidth={1.5} />
        )}
      </Button>

      {/* Logout */}
      <Button
        variant='ghost'
        size='icon'
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label='Cerrar sesión'
      >
        <LogOut size={18} strokeWidth={1.5} />
      </Button>

      {/* Avatar */}
      <Avatar className='size-8'>
        <AvatarFallback className='bg-primary text-primary-foreground text-xs font-semibold'>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Mobile sidebar Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side='left' className='p-0 w-64'>
          <Sidebar forceExpanded onNavClick={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
