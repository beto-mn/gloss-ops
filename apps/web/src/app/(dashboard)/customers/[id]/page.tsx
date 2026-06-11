'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronRight,
  Pencil,
  Plus,
  ClipboardList,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CustomerDrawer } from '@/components/customers/customer-drawer'
import { VehicleDrawer } from '@/components/customers/vehicle-drawer'
import { useCustomer } from '@/hooks/use-customers'
import { useCustomerAssets, useDeleteAsset } from '@/hooks/use-customer-assets'
import { ApiError } from '@/lib/api-client'
import type { CustomerAsset } from '@/lib/schemas/customer-asset.schema'

const ASSET_TYPE_LABELS: Record<string, string> = {
  VEHICLE: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  BOAT: 'Embarcación',
  JET_SKI: 'Jet ski',
  TRUCK: 'Camión',
  OTHER: 'Otro',
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className='text-xs text-muted-foreground mb-0.5'>{label}</p>
      <p className='text-sm'>{value || '—'}</p>
    </div>
  )
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: customer, isLoading: loadingCustomer } = useCustomer(id)
  const { data: assets, isLoading: loadingAssets } = useCustomerAssets(id)
  const deleteAsset = useDeleteAsset(id)

  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false)
  const [vehicleDrawerOpen, setVehicleDrawerOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<CustomerAsset | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<CustomerAsset | null>(null)

  function openEditVehicle(asset: CustomerAsset, e: React.MouseEvent) {
    e.stopPropagation()
    setEditAsset(asset)
    setVehicleDrawerOpen(true)
  }

  function openCreateVehicle() {
    setEditAsset(undefined)
    setVehicleDrawerOpen(true)
  }

  async function confirmDeleteAsset() {
    if (!deleteTarget) return
    try {
      await deleteAsset.mutateAsync(deleteTarget.id)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loadingCustomer) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='h-5 w-48 bg-muted animate-pulse rounded' />
        <div className='rounded-lg border border-border p-6 grid gap-4 sm:grid-cols-2'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='flex flex-col gap-1'>
              <div className='h-3 w-20 bg-muted animate-pulse rounded' />
              <div className='h-4 w-32 bg-muted animate-pulse rounded' />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className='flex flex-col items-center justify-center py-24 gap-4'>
        <p className='text-muted-foreground'>Cliente no encontrado.</p>
        <Button variant='outline' asChild>
          <Link href='/customers'>Volver a clientes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Breadcrumb */}
      <nav className='flex items-center gap-1 text-sm text-muted-foreground'>
        <Link
          href='/customers'
          className='hover:text-foreground transition-colors'
        >
          Clientes
        </Link>
        <ChevronRight size={14} />
        <span className='text-foreground font-medium'>
          {customer.firstName} {customer.lastName}
        </span>
      </nav>

      {/* Header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>
            {customer.firstName} {customer.lastName}
          </h2>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              router.push(`/work-orders/new?customerId=${customer.id}`)
            }
          >
            <ClipboardList size={16} />
            Nueva orden
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setCustomerDrawerOpen(true)}
          >
            <Pencil size={16} />
            Editar
          </Button>
        </div>
      </div>

      {/* Customer info */}
      <section className='rounded-lg border border-border p-6'>
        <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4'>
          Información del cliente
        </h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <Field label='Correo electrónico' value={customer.email} />
          <Field label='Teléfono' value={customer.phone} />
          <Field label='Dirección' value={customer.address} />
          <Field label='RFC' value={customer.taxId} />
          <Field label='Régimen fiscal' value={customer.fiscalRegime} />
          <Field label='Código postal' value={customer.zipCode} />
          <Field label='Fuente' value={customer.source} />
          {customer.note && (
            <div className='sm:col-span-2 lg:col-span-3'>
              <Field label='Notas' value={customer.note} />
            </div>
          )}
        </div>
      </section>

      {/* Vehicles */}
      <section className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-base font-semibold'>Vehículos</h3>
          <Button size='sm' variant='outline' onClick={openCreateVehicle}>
            <Plus size={16} />
            Agregar vehículo
          </Button>
        </div>

        <div className='overflow-x-auto rounded-md border border-border'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Tipo
                </th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Marca / Modelo
                </th>
                <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                  Año
                </th>
                <th className='hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                  Identificador
                </th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Color
                </th>
                <th className='px-4 py-3 w-10' />
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {loadingAssets ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className='px-4 py-3'>
                        <div className='h-4 bg-muted animate-pulse rounded' />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !assets || assets.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className='px-4 py-12 text-center text-muted-foreground'
                  >
                    No hay vehículos registrados.{' '}
                    <button
                      className='text-primary hover:underline'
                      onClick={openCreateVehicle}
                    >
                      Agregar el primero.
                    </button>
                  </td>
                </tr>
              ) : (
                assets.data.map(asset => (
                  <tr
                    key={asset.id}
                    className='hover:bg-muted/30 transition-colors cursor-pointer'
                    onClick={() =>
                      router.push(`/customers/${id}/vehicles/${asset.id}`)
                    }
                  >
                    <td className='px-4 py-3'>
                      {ASSET_TYPE_LABELS[asset.assetType] ??
                        asset.customAssetType ??
                        asset.assetType}
                    </td>
                    <td className='px-4 py-3'>{asset.model ?? '—'}</td>
                    <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                      {asset.year ?? '—'}
                    </td>
                    <td className='hidden sm:table-cell px-4 py-3 text-muted-foreground'>
                      {asset.identifier ?? '—'}
                    </td>
                    <td className='px-4 py-3 text-muted-foreground'>
                      {asset.color ?? '—'}
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
                                openEditVehicle(
                                  asset,
                                  e as unknown as React.MouseEvent
                                )
                              }
                            >
                              <Pencil size={14} />
                              Editar
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className='flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none'
                              onSelect={() =>
                                router.push(
                                  `/work-orders/new?customerId=${customer.id}&assetId=${asset.id}`
                                )
                              }
                            >
                              <ClipboardList size={14} />
                              Nueva orden
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className='h-px bg-border my-1' />
                            <DropdownMenu.Item
                              className='flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive cursor-pointer hover:bg-destructive/10 outline-none'
                              onSelect={() => setDeleteTarget(asset)}
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </DropdownMenu.Item>
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
      </section>

      <CustomerDrawer
        open={customerDrawerOpen}
        onOpenChange={setCustomerDrawerOpen}
        customer={customer}
      />

      <VehicleDrawer
        open={vehicleDrawerOpen}
        onOpenChange={open => {
          setVehicleDrawerOpen(open)
          if (!open) setEditAsset(undefined)
        }}
        customerId={id}
        asset={editAsset}
      />

      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Eliminar vehículo?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              El vehículo se archivará y dejará de aparecer en nuevas órdenes.
              El historial asociado se conserva.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant='destructive'
                  onClick={confirmDeleteAsset}
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
