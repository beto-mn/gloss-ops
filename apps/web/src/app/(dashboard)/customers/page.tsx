'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Tabs from '@radix-ui/react-tabs'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  PowerOff,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomerDrawer } from '@/components/customers/customer-drawer'
import {
  useCustomers,
  useArchiveCustomer,
  useReactivateCustomer,
} from '@/hooks/use-customers'
import { ApiError, getUserRole } from '@/lib/api-client'
import type { CustomerWithCount } from '@/lib/schemas/customer.schema'

type SortOption =
  | 'firstName_asc'
  | 'firstName_desc'
  | 'createdAt_desc'
  | 'createdAt_asc'

const SORT_LABELS: Record<SortOption, string> = {
  firstName_asc: 'Nombre A-Z',
  firstName_desc: 'Nombre Z-A',
  createdAt_desc: 'Más reciente',
  createdAt_asc: 'Más antiguo',
}

function parseSortOption(opt: SortOption) {
  const [sortBy, sortOrder] = opt.split('_') as [
    'firstName' | 'createdAt',
    'asc' | 'desc',
  ]
  return { sortBy, sortOrder }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function CustomersPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('createdAt_desc')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<
    CustomerWithCount | undefined
  >()
  const [archiveTarget, setArchiveTarget] = useState<CustomerWithCount | null>(
    null
  )

  const [reactivateTarget, setReactivateTarget] =
    useState<CustomerWithCount | null>(null)

  const archive = useArchiveCustomer()
  const reactivate = useReactivateCustomer()

  const canReactivate = ['OWNER', 'MANAGER'].includes(getUserRole() ?? '')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { sortBy, sortOrder } = parseSortOption(sort)

  const { data, isLoading } = useCustomers({
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    status: tab,
    page,
    limit: 20,
  })

  const handleTabChange = useCallback((value: string) => {
    setTab(value as 'ACTIVE' | 'INACTIVE')
    setPage(1)
    setSearch('')
    setDebouncedSearch('')
  }, [])

  function openCreate() {
    setEditCustomer(undefined)
    setDrawerOpen(true)
  }

  function openEdit(customer: CustomerWithCount, e: React.MouseEvent) {
    e.stopPropagation()
    setEditCustomer(customer)
    setDrawerOpen(true)
  }

  async function confirmArchive() {
    if (!archiveTarget) return
    try {
      await archive.mutateAsync(archiveTarget.id)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setArchiveTarget(null)
    }
  }

  async function confirmReactivate() {
    if (!reactivateTarget) return
    try {
      await reactivate.mutateAsync(reactivateTarget.id)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setReactivateTarget(null)
    }
  }

  const customers = data?.data ?? []
  const meta = data?.meta

  return (
    <div className='flex flex-col gap-6 pr-2'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-foreground'>Clientes</h2>
        <Button onClick={openCreate} size='sm'>
          <Plus size={16} />
          Nuevo cliente
        </Button>
      </div>

      <Tabs.Root value={tab} onValueChange={handleTabChange}>
        <Tabs.List className='flex gap-1 border-b border-border mb-4'>
          {(['ACTIVE', 'INACTIVE'] as const).map(t => (
            <Tabs.Trigger
              key={t}
              value={t}
              className='px-4 py-2 text-sm font-medium text-muted-foreground border-b-2 border-transparent -mb-px transition-colors cursor-pointer data-[state=active]:text-foreground data-[state=active]:border-primary'
            >
              {t === 'ACTIVE' ? 'Activos' : 'Inactivos'}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className='flex flex-col sm:flex-row gap-3 mb-4'>
          <div className='relative flex-1'>
            <Search
              size={16}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            />
            <Input
              placeholder='Buscar por nombre, correo o teléfono…'
              className='pl-9'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className='relative'>
            <select
              value={sort}
              onChange={e => {
                setSort(e.target.value as SortOption)
                setPage(1)
              }}
              className='h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer'
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
                <option key={opt} value={opt}>
                  {SORT_LABELS[opt]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className='absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground'
            />
          </div>
        </div>

        <Tabs.Content value={tab}>
          <div className='overflow-x-auto rounded-md border border-border'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                    Nombre
                  </th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                    Teléfono
                  </th>
                  <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                    Correo
                  </th>
                  <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                    Registrado
                  </th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                    &nbsp;
                  </th>
                  <th className='px-4 py-3 w-10' />
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className='px-4 py-3'>
                          <div className='h-4 bg-muted animate-pulse rounded' />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-4 py-12 text-center text-muted-foreground'
                    >
                      {tab === 'ACTIVE'
                        ? 'No hay clientes activos. Crea el primero.'
                        : 'No hay clientes inactivos.'}
                    </td>
                  </tr>
                ) : (
                  customers.map(c => (
                    <tr
                      key={c.id}
                      className='hover:bg-muted/30 cursor-pointer transition-colors'
                      onClick={() => router.push(`/customers/${c.id}`)}
                    >
                      <td className='px-4 py-3 font-medium'>
                        {c.firstName} {c.lastName}
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        {c.phone ?? '—'}
                      </td>
                      <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                        {c.email ?? '—'}
                      </td>
                      <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                        {formatDate(c.createdAt)}
                      </td>
                      <td className='px-4 py-3'>
                        {c.activeWorkOrderCount > 0 && (
                          <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                            Orden activa
                          </span>
                        )}
                      </td>
                      <td
                        className='px-4 py-3'
                        onClick={e => e.stopPropagation()}
                      >
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8'
                            >
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className='z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95'
                              align='end'
                            >
                              <DropdownMenu.Item
                                className='flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none'
                                onSelect={e =>
                                  openEdit(c, e as unknown as React.MouseEvent)
                                }
                              >
                                <Pencil size={14} />
                                Editar
                              </DropdownMenu.Item>
                              {tab === 'ACTIVE' ? (
                                <DropdownMenu.Item
                                  className='flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none'
                                  onSelect={() => setArchiveTarget(c)}
                                >
                                  <PowerOff size={14} />
                                  Desactivar
                                </DropdownMenu.Item>
                              ) : (
                                canReactivate && (
                                  <DropdownMenu.Item
                                    className='flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none'
                                    onSelect={() => setReactivateTarget(c)}
                                  >
                                    <RotateCcw size={14} />
                                    Reactivar
                                  </DropdownMenu.Item>
                                )
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className='flex items-center justify-between mt-4 text-sm text-muted-foreground'>
              <span>
                {meta.total} cliente{meta.total !== 1 ? 's' : ''}
              </span>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  disabled={!meta.hasPrev}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span>
                  {meta.page} / {meta.totalPages}
                </span>
                <Button
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  disabled={!meta.hasNext}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <CustomerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        customer={editCustomer}
      />

      {/* Reactivate confirmation */}
      <AlertDialog.Root
        open={!!reactivateTarget}
        onOpenChange={o => !o && setReactivateTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Reactivar cliente?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              {reactivateTarget?.firstName} {reactivateTarget?.lastName} volverá
              a aparecer en la pestaña de Activos.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  onClick={confirmReactivate}
                  disabled={reactivate.isPending}
                >
                  Reactivar
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Archive confirmation */}
      <AlertDialog.Root
        open={!!archiveTarget}
        onOpenChange={o => !o && setArchiveTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Desactivar cliente?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              {archiveTarget?.firstName} {archiveTarget?.lastName} pasará a la
              pestaña de Inactivos y no aparecerá en nuevas órdenes.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={confirmArchive} disabled={archive.isPending}>
                  Desactivar
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
