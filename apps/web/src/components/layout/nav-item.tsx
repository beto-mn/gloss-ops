'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isCollapsed: boolean
  onClick?: () => void
}

export function NavItem({
  href,
  icon: Icon,
  label,
  isCollapsed,
  onClick,
}: NavItemProps) {
  const pathname = usePathname()
  const isActive =
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const button = (
    <Button
      variant='ghost'
      asChild
      onClick={onClick}
      className={cn(
        'w-full justify-start gap-3 px-3 transition-colors duration-150',
        isCollapsed && 'justify-center px-0',
        isActive &&
          'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
      )}
    >
      <Link href={href}>
        <Icon size={18} strokeWidth={1.5} className='shrink-0' />
        {!isCollapsed && <span>{label}</span>}
      </Link>
    </Button>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side='right'>{label}</TooltipContent>
      </Tooltip>
    )
  }

  return button
}
