import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  icon: LucideIcon
  value?: string | number
}

export function StatCard({ title, icon: Icon, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>
          {title}
        </CardTitle>
        <Icon
          size={18}
          strokeWidth={1.5}
          className='text-muted-foreground shrink-0'
        />
      </CardHeader>
      <CardContent>
        {value !== undefined ? (
          <p className='text-2xl font-bold text-foreground'>{value}</p>
        ) : (
          <Skeleton className='h-8 w-24' />
        )}
      </CardContent>
    </Card>
  )
}
