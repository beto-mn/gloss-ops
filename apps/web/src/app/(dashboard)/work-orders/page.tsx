'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Tabs from '@radix-ui/react-tabs'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useWorkOrders,
  useTransitionWorkOrderStatus,
  useDeleteWorkOrder,
} from '@/hooks/use-work-orders'
import { ApiError, getUserRole } from '@/lib/api-client'
import type {
  WorkOrderListItem,
  WorkOrderStatus,
} from '@/lib/schemas/work-order.schema'

type TabValue = 'ALL' | WorkOrderStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
]

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

const STATUS_CLASSES: Record<WorkOrderStatus, string> = {
  DRAFT:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  COMPLETED:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-muted text-muted-foreground',
}

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Estándar',
  WARRANTY_CLAIM: 'Garantía',
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  VEHICLE: 'Auto',
  MOTORCYCLE: 'Moto',
  BOAT: 'Embarcación',
  JET_SKI: 'Jet ski',
  TRUCK: 'Camión',
  OTHER: 'Otro',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export default function WorkOrdersPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    setRole(getUserRole())
  }, [])
  const canManage = ['OWNER', 'MANAGER'].includes(role ?? '')
  const isOwner = role === 'OWNER'

  const [tab, setTab] = useState<TabValue>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState<WorkOrderListItem | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<WorkOrderListItem | null>(
    null
  )

  const transition = useTransitionWorkOrderStatus()
  const deleteWO = useDeleteWorkOrder()

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useWorkOrders({
    status: tab,
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  })

  function handleTabChange(value: string) {
    setTab(value as TabValue)
    setPage(1)
    setSearch('')
    setDebouncedSearch('')
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    try {
      await transition.mutateAsync({
        id: cancelTarget.id,
        status: 'CANCELLED',
      })
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setCancelTarget(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteWO.mutateAsync(deleteTarget.id)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setDeleteTarget(null)
    }
  }

  const orders = data?.data ?? []
  const meta = data?.meta

  return (
    <div className='flex flex-col gap-6 pr-2'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-foreground'>
          Órdenes de trabajo
        </h2>
        <Button onClick={() => router.push('/work-orders/new')} size='sm'>
          <Plus size={16} />
          Nueva orden
        </Button>
      </div>

      <Tabs.Root value={tab} onValueChange={handleTabChange}>
        <Tabs.List className='flex gap-1 border-b border-border mb-4 overflow-x-auto'>
          {TABS.map(t => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className='px-4 py-2 text-sm font-medium text-muted-foreground border-b-2 border-transparent -mb-px transition-colors cursor-pointer whitespace-nowrap data-[state=active]:text-foreground data-[state=active]:border-primary'
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className='mb-4'>
          <div className='relative'>
            <Search
              size={16}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            />
            <Input
              placeholder='Buscar por folio o cliente…'
              className='pl-9'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs.Content value={tab}>
          <div className='overflow-x-auto rounded-md border border-border'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                    Folio
                  </th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                    Cliente
                  </th>
                  <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                    Activo
                  </th>
                  <th className='hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                    Tipo
                  </th>
                  <th className='hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                    Programada
                  </th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                    Status
                  </th>
                  <th className='px-4 py-3 w-10' />
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className='px-4 py-3'>
                          <div className='h-4 bg-muted animate-pulse rounded' />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-4 py-12 text-center text-muted-foreground'
                    >
                      No hay órdenes de trabajo.
                    </td>
                  </tr>
                ) : (
                  orders.map(wo => (
                    <tr
                      key={wo.id}
                      className='hover:bg-muted/30 cursor-pointer transition-colors'
                      onClick={() => router.push(`/work-orders/${wo.id}`)}
                    >
                      <td className='px-4 py-3 font-medium font-mono text-xs'>
                        {wo.folio}
                      </td>
                      <td className='px-4 py-3'>
                        {wo.customer.firstName} {wo.customer.lastName}
                      </td>
                      <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                        {ASSET_TYPE_LABELS[wo.asset.assetType] ??
                          wo.asset.assetType}
                        {wo.asset.model ? ` · ${wo.asset.model}` : ''}
                      </td>
                      <td className='hidden md:table-cell px-4 py-3 text-muted-foreground'>
                        {TYPE_LABELS[wo.type] ?? wo.type}
                      </td>
                      <td className='hidden md:table-cell px-4 py-3 text-muted-foreground'>
                        {formatDate(wo.scheduledAt)}
                      </td>
                      <td className='px-4 py-3'>
                        <StatusBadge status={wo.status} />
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
                                onSelect={() =>
                                  router.push(`/work-orders/${wo.id}`)
                                }
                              >
                                <Eye size={14} />
                                Ver detalle
                              </DropdownMenu.Item>

                              {canManage &&
                                wo.status !== 'COMPLETED' &&
                                wo.status !== 'CANCELLED' && (
                                  <DropdownMenu.Item
                                    className='flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none'
                                    onSelect={() => setCancelTarget(wo)}
                                  >
                                    <XCircle size={14} />
                                    Cancelar
                                  </DropdownMenu.Item>
                                )}

                              {isOwner && wo.status === 'DRAFT' && (
                                <>
                                  <DropdownMenu.Separator className='h-px bg-border my-1' />
                                  <DropdownMenu.Item
                                    className='flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive cursor-pointer hover:bg-destructive/10 outline-none'
                                    onSelect={() => setDeleteTarget(wo)}
                                  >
                                    <Trash2 size={14} />
                                    Eliminar
                                  </DropdownMenu.Item>
                                </>
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
                {meta.total} orden{meta.total !== 1 ? 'es' : ''}
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

      <AlertDialog.Root
        open={!!cancelTarget}
        onOpenChange={o => !o && setCancelTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Cancelar orden?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              La orden {cancelTarget?.folio} pasará a status Cancelada. Esta
              acción no se puede deshacer.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>No, mantener</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant='destructive'
                  onClick={confirmCancel}
                  disabled={transition.isPending}
                >
                  Cancelar orden
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Eliminar orden?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              Esta acción es permanente. Se eliminará la orden{' '}
              {deleteTarget?.folio}.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant='destructive'
                  onClick={confirmDelete}
                  disabled={deleteWO.isPending}
                >
                  Eliminar
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
