'use client'

import { useState, useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  PowerOff,
  Power,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ServiceDrawer } from '@/components/services/service-drawer'
import {
  useServicesPage,
  useActivateService,
  useDeactivateService,
} from '@/hooks/use-services'
import { getUserRole } from '@/lib/api-client'
import type { Service, ServiceListParams } from '@/lib/schemas/service.schema'

// ─── Constants ────────────────────────────────────────────────────────────────

type TabValue = 'ALL' | 'ACTIVE' | 'INACTIVE'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'INACTIVE', label: 'Inactivos' },
]

const LIMIT = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(n)
}

function formatWarranty(days: number) {
  if (days === 0) return 'Sin garantía'
  return `${days} ${days === 1 ? 'día' : 'días'}`
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const classes = isActive
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-muted text-muted-foreground'
  const label = isActive ? 'Activo' : 'Inactivo'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(getUserRole())
  }, [])
  const canWrite = role === 'OWNER' || role === 'MANAGER'

  const [tab, setTab] = useState<TabValue>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editService, setEditService] = useState<Service | undefined>()

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const params: ServiceListParams = {
    ...(tab !== 'ACTIVE' && { includeInactive: true }),
    ...(debouncedSearch && { search: debouncedSearch }),
    page,
    limit: LIMIT,
  }

  const { data: servicesPage, isLoading } = useServicesPage(params)
  const activate = useActivateService()
  const deactivate = useDeactivateService()

  const allServices = servicesPage?.data ?? []
  const services =
    tab === 'INACTIVE' ? allServices.filter(svc => !svc.isActive) : allServices
  const meta = servicesPage?.meta

  function openCreate() {
    setEditService(undefined)
    setDrawerOpen(true)
  }

  function openEdit(svc: Service) {
    setEditService(svc)
    setDrawerOpen(true)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-foreground'>Servicios</h2>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nuevo servicio
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        {/* Tabs */}
        <div className='flex rounded-md border border-border overflow-hidden w-fit'>
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => {
                setTab(t.value)
                setPage(1)
              }}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className='relative w-full sm:w-64'>
          <Search
            size={15}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
          />
          <Input
            className='pl-9'
            placeholder='Buscar servicio…'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className='rounded-lg border border-border overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 border-b border-border'>
            <tr>
              <th className='text-left px-4 py-3 font-medium text-muted-foreground'>
                Nombre
              </th>
              <th className='text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell'>
                Descripción
              </th>
              <th className='text-right px-4 py-3 font-medium text-muted-foreground'>
                Precio
              </th>
              <th className='text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell'>
                Garantía
              </th>
              <th className='text-center px-4 py-3 font-medium text-muted-foreground'>
                Status
              </th>
              {canWrite && (
                <th className='px-4 py-3 w-10'>
                  <span className='sr-only'>Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className='px-4 py-3'>
                    <div className='h-4 bg-muted animate-pulse rounded w-32' />
                  </td>
                  <td className='px-4 py-3 hidden md:table-cell'>
                    <div className='h-4 bg-muted animate-pulse rounded w-48' />
                  </td>
                  <td className='px-4 py-3'>
                    <div className='h-4 bg-muted animate-pulse rounded w-16 ml-auto' />
                  </td>
                  <td className='px-4 py-3 hidden sm:table-cell'>
                    <div className='h-4 bg-muted animate-pulse rounded w-20 mx-auto' />
                  </td>
                  <td className='px-4 py-3'>
                    <div className='h-5 bg-muted animate-pulse rounded-full w-16 mx-auto' />
                  </td>
                  {canWrite && <td className='px-4 py-3' />}
                </tr>
              ))
            ) : services.length === 0 ? (
              <tr>
                <td
                  colSpan={canWrite ? 6 : 5}
                  className='px-4 py-10 text-center text-muted-foreground text-sm'
                >
                  No se encontraron servicios
                </td>
              </tr>
            ) : (
              services.map(svc => (
                <tr
                  key={svc.id}
                  className='hover:bg-muted/30 transition-colors'
                >
                  <td className='px-4 py-3 font-medium text-foreground'>
                    {svc.name}
                  </td>
                  <td className='px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate'>
                    {svc.description ?? '—'}
                  </td>
                  <td className='px-4 py-3 text-right font-medium'>
                    {formatCurrency(Number(svc.basePrice))}
                  </td>
                  <td className='px-4 py-3 text-center text-muted-foreground hidden sm:table-cell'>
                    {formatWarranty(svc.warrantyDays ?? 0)}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    <StatusBadge isActive={svc.isActive} />
                  </td>
                  {canWrite && (
                    <td className='px-4 py-3'>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className='p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'>
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align='end'
                            className='z-50 min-w-[140px] rounded-md border border-border bg-popover p-1 shadow-md'
                          >
                            <DropdownMenu.Item
                              onSelect={() => openEdit(svc)}
                              className='flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-muted outline-none'
                            >
                              <Pencil size={14} />
                              Editar
                            </DropdownMenu.Item>

                            {svc.isActive ? (
                              <DropdownMenu.Item
                                onSelect={() => deactivate.mutate(svc.id)}
                                className='flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-muted outline-none'
                              >
                                <PowerOff size={14} />
                                Desactivar
                              </DropdownMenu.Item>
                            ) : (
                              <DropdownMenu.Item
                                onSelect={() => activate.mutate(svc.id)}
                                className='flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-muted outline-none'
                              >
                                <Power size={14} />
                                Activar
                              </DropdownMenu.Item>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <span>
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} de{' '}
            {meta.total}
          </span>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage(p => p - 1)}
              disabled={!meta.hasPrev}
            >
              <ChevronLeft size={14} />
              Anterior
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage(p => p + 1)}
              disabled={!meta.hasNext}
            >
              Siguiente
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Service drawer */}
      <ServiceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        service={editService}
      />
    </div>
  )
}
