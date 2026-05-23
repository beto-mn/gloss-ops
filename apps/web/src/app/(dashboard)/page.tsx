'use client'

import {
  ClipboardList,
  Wrench,
  Users,
  Car,
  TrendingUp,
  FileText,
  Activity,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'

const STAT_CARDS = [
  { title: 'Órdenes hoy', icon: ClipboardList },
  { title: 'Órdenes activas', icon: Wrench },
  { title: 'Clientes', icon: Users },
  { title: 'Vehículos', icon: Car },
  { title: 'Ingresos del mes', icon: TrendingUp },
  { title: 'Facturas pendientes', icon: FileText },
]

export default function DashboardPage() {
  return (
    <div className='space-y-6'>
      {/* Heading */}
      <div>
        <h2 className='text-2xl font-bold text-foreground'>Dashboard</h2>
        <p className='text-sm text-muted-foreground mt-1'>
          Resumen de la actividad de tu taller
        </p>
      </div>

      {/* Stat cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {STAT_CARDS.map(card => (
          <StatCard key={card.title} title={card.title} icon={card.icon} />
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <h3 className='text-base font-semibold text-foreground mb-3'>
          Actividad reciente
        </h3>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12 gap-3'>
            <Activity
              size={32}
              strokeWidth={1.5}
              className='text-muted-foreground'
            />
            <p className='text-sm text-muted-foreground'>
              Sin actividad reciente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
