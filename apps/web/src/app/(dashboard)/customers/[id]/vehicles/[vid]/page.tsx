'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { ChevronRight, ClipboardList, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { VehicleDrawer } from '@/components/customers/vehicle-drawer'
import { useCustomer } from '@/hooks/use-customers'
import { useAsset, useDeleteAsset } from '@/hooks/use-customer-assets'
import { useAssetWarranties } from '@/hooks/use-warranties'
import { useWorkOrders } from '@/hooks/use-work-orders'
import { useBrands } from '@/hooks/use-brands'
import { ApiError } from '@/lib/api-client'
import type { AssetType } from '@/lib/schemas/customer-asset.schema'
import type {
  WorkOrderStatus,
  WorkOrderType,
} from '@/lib/schemas/work-order.schema'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  VEHICLE: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  BOAT: 'Embarcación',
  JET_SKI: 'Jet ski',
  TRUCK: 'Camión',
  ATV_UTV: 'ATV / UTV',
  AIRCRAFT: 'Aeronave',
  OTHER: 'Otro',
}

const WO_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

const WO_STATUS_CLASSES: Record<WorkOrderStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const WO_TYPE_LABELS: Record<WorkOrderType, string> = {
  STANDARD: 'Estándar',
  WARRANTY_CLAIM: 'Garantía',
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className='text-xs text-muted-foreground mb-0.5'>{label}</p>
      <p className='text-sm'>{value || '—'}</p>
    </div>
  )
}

function warrantyStatus(isVoid: boolean, validUntil: string) {
  if (isVoid)
    return {
      label: 'Anulada',
      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
  if (new Date(validUntil) < new Date())
    return {
      label: 'Vencida',
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
  return {
    label: 'Vigente',
    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const vid = params.vid as string

  const { data: customer, isLoading: loadingCustomer } = useCustomer(id)
  const { data: asset, isLoading: loadingAsset } = useAsset(vid)
  const { data: warranties, isLoading: loadingWarranties } =
    useAssetWarranties(vid)
  const { data: workOrders, isLoading: loadingWO } = useWorkOrders({
    assetId: vid,
  })
  const { data: brands } = useBrands()
  const deleteAsset = useDeleteAsset(id)

  const [vehicleDrawerOpen, setVehicleDrawerOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isLoading = loadingCustomer || loadingAsset

  async function confirmDelete() {
    try {
      await deleteAsset.mutateAsync(vid)
      router.push(`/customers/${id}`)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='h-4 w-64 bg-muted animate-pulse rounded' />
        <div className='h-8 w-48 bg-muted animate-pulse rounded' />
        <div className='rounded-lg border border-border p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='flex flex-col gap-1'>
              <div className='h-3 w-20 bg-muted animate-pulse rounded' />
              <div className='h-4 w-32 bg-muted animate-pulse rounded' />
            </div>
          ))}
        </div>
        <div className='rounded-lg border border-border overflow-hidden'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='px-4 py-3 border-b border-border last:border-0'
            >
              <div className='h-4 w-full bg-muted animate-pulse rounded' />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!asset || asset.customerId !== id) {
    return (
      <div className='flex flex-col items-center justify-center py-24 gap-4'>
        <p className='text-muted-foreground'>Vehículo no encontrado.</p>
        <Button variant='outline' asChild>
          <Link href='/customers'>Volver a clientes</Link>
        </Button>
      </div>
    )
  }

  const brandName = brands?.find(b => b.id === asset.brandId)?.name
  const vehicleTitle = [brandName, asset.model, asset.year]
    .filter(Boolean)
    .join(' ')

  return (
    <div className='flex flex-col gap-6'>
      {/* Breadcrumb */}
      <nav className='flex items-center gap-1 text-sm text-muted-foreground flex-wrap'>
        <Link
          href='/customers'
          className='hover:text-foreground transition-colors'
        >
          Clientes
        </Link>
        <ChevronRight size={14} />
        <Link
          href={`/customers/${id}`}
          className='hover:text-foreground transition-colors'
        >
          {customer ? `${customer.firstName} ${customer.lastName}` : '…'}
        </Link>
        <ChevronRight size={14} />
        <span className='text-foreground font-medium'>
          {[asset.model, asset.year].filter(Boolean).join(' ')}
        </span>
      </nav>

      {/* Header */}
      <div className='flex items-start justify-between gap-4'>
        <h2 className='text-2xl font-bold text-foreground'>{vehicleTitle}</h2>
        <div className='flex items-center gap-2 shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              router.push(`/work-orders/new?customerId=${id}&assetId=${vid}`)
            }
          >
            <ClipboardList size={16} />
            Nueva orden
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setVehicleDrawerOpen(true)}
          >
            <Pencil size={16} />
            Editar
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='text-destructive hover:bg-destructive/10'
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 size={16} />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Vehicle info */}
      <section className='rounded-lg border border-border p-6'>
        <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4'>
          Información del vehículo
        </h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <Field label='Tipo' value={ASSET_TYPE_LABELS[asset.assetType]} />
          {asset.assetType === 'OTHER' && (
            <Field label='Tipo personalizado' value={asset.customAssetType} />
          )}
          <Field label='Marca' value={brandName} />
          <Field label='Modelo' value={asset.model} />
          <Field label='Año' value={asset.year?.toString()} />
          <Field label='Identificador' value={asset.identifier} />
          <Field label='País' value={asset.country} />
          <Field label='Color' value={asset.color} />
          {asset.note && (
            <div className='sm:col-span-2 lg:col-span-3'>
              <Field label='Notas' value={asset.note} />
            </div>
          )}
        </div>
      </section>

      {/* Warranties */}
      <section className='flex flex-col gap-4'>
        <h3 className='text-base font-semibold'>Garantías</h3>
        <div className='overflow-x-auto rounded-md border border-border'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Descripción
                </th>
                <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                  Vigencia
                </th>
                <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                  Término
                </th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {loadingWarranties ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className='px-4 py-3'>
                        <div className='h-4 bg-muted animate-pulse rounded' />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !warranties || warranties.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className='px-4 py-10 text-center text-muted-foreground'
                  >
                    Sin garantías registradas.
                  </td>
                </tr>
              ) : (
                warranties.map(w => {
                  const status = warrantyStatus(w.isVoid, w.validUntil)
                  return (
                    <tr key={w.id}>
                      <td className='px-4 py-3'>{w.description}</td>
                      <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                        {formatDate(w.validFrom)} – {formatDate(w.validUntil)}
                      </td>
                      <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                        {w.term ?? '—'}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Work orders */}
      <section className='flex flex-col gap-4'>
        <h3 className='text-base font-semibold'>Órdenes de trabajo</h3>
        <div className='overflow-x-auto rounded-md border border-border'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Folio
                </th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Estado
                </th>
                <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                  Tipo
                </th>
                <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {loadingWO ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className='px-4 py-3'>
                        <div className='h-4 bg-muted animate-pulse rounded' />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !workOrders || workOrders.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className='px-4 py-10 text-center text-muted-foreground'
                  >
                    Sin órdenes de trabajo.
                  </td>
                </tr>
              ) : (
                workOrders.data.map(wo => (
                  <tr
                    key={wo.id}
                    className='hover:bg-muted/30 transition-colors cursor-pointer'
                    onClick={() => router.push(`/work-orders/${wo.id}`)}
                  >
                    <td className='px-4 py-3 font-mono text-xs'>{wo.folio}</td>
                    <td className='px-4 py-3'>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${WO_STATUS_CLASSES[wo.status]}`}
                      >
                        {WO_STATUS_LABELS[wo.status]}
                      </span>
                    </td>
                    <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                      {WO_TYPE_LABELS[wo.type]}
                    </td>
                    <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                      {formatDate(wo.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <VehicleDrawer
        open={vehicleDrawerOpen}
        onOpenChange={open => setVehicleDrawerOpen(open)}
        customerId={id}
        asset={asset}
      />

      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={o => !o && setDeleteDialogOpen(false)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Eliminar vehículo?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              Esta acción no se puede deshacer. El vehículo y sus datos serán
              eliminados permanentemente.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant='destructive'
                  onClick={confirmDelete}
                  disabled={deleteAsset.isPending}
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
