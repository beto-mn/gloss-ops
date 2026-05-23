'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Package,
  Wrench,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NavItem } from '@/components/layout/nav-item'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/customers', icon: Users, label: 'Clientes' },
  { href: '/work-orders', icon: ClipboardList, label: 'Órdenes de trabajo' },
  { href: '/inventory', icon: Package, label: 'Inventario' },
  { href: '/services', icon: Wrench, label: 'Servicios' },
  { href: '/activity-log', icon: Activity, label: 'Actividad' },
]

interface SidebarProps {
  forceExpanded?: boolean
  onNavClick?: () => void
}

export function Sidebar({ forceExpanded = false, onNavClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const collapsed = forceExpanded ? false : isCollapsed

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col bg-card border-r border-border overflow-hidden',
          'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex h-14 items-center border-b border-border shrink-0',
            collapsed ? 'justify-center px-0' : 'px-4 gap-2'
          )}
        >
          <div className='size-7 rounded-md bg-primary flex items-center justify-center shrink-0'>
            <span className='text-primary-foreground text-xs font-bold'>G</span>
          </div>
          {!collapsed && (
            <span className='font-semibold text-sm text-foreground tracking-tight'>
              GlossOps
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className='flex-1 overflow-y-auto py-3 px-2 space-y-0.5'>
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isCollapsed={collapsed}
              onClick={onNavClick}
            />
          ))}
        </nav>

        {/* Collapse toggle */}
        {!forceExpanded && (
          <>
            <Separator />
            <div className='p-2'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setIsCollapsed(v => !v)}
                className='w-full h-8'
                aria-label={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
              >
                {collapsed ? (
                  <ChevronRight size={16} strokeWidth={1.5} />
                ) : (
                  <ChevronLeft size={16} strokeWidth={1.5} />
                )}
              </Button>
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  )
}
