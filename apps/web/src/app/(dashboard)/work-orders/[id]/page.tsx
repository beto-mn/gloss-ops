'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  UserPlus,
  Camera,
  X,
  AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Combobox } from '@/components/ui/combobox'
import { WorkOrderEditDrawer } from '@/components/work-orders/work-order-edit-drawer'
import {
  useWorkOrder,
  useTransitionWorkOrderStatus,
} from '@/hooks/use-work-orders'
import {
  useWorkOrderAssignments,
  useAssignTechnician,
  useUnassignTechnician,
} from '@/hooks/use-work-order-assignments'
import {
  useCheckpoints,
  useCreateCheckpoint,
  useUpdateCheckpoint,
  useDeleteCheckpoint,
} from '@/hooks/use-checkpoints'
import { useWorkOrderWarranties } from '@/hooks/use-warranties'
import { useWorkOrderInvoice, useCreateInvoice } from '@/hooks/use-invoices'
import { useMembers } from '@/hooks/use-members'
import { ApiError, getUserRole } from '@/lib/api-client'
import {
  WorkOrderStatus,
  type WorkOrderCheckpoint,
  type WorkOrderAssignment,
} from '@/lib/schemas/work-order.schema'

// ─── Constants ────────────────────────────────────────────────────────────────

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
  VEHICLE: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  BOAT: 'Embarcación',
  JET_SKI: 'Jet ski',
  TRUCK: 'Camión',
  OTHER: 'Otro',
}

const ASSIGNMENT_ROLE_LABELS: Record<string, string> = {
  LEAD: 'Principal',
  ASSISTANT: 'Asistente',
}

const CHECKPOINT_TYPE_LABELS: Record<string, string> = {
  RECEPTION: 'Recepción',
  PROCESS: 'Proceso',
  DELIVERY: 'Entrega',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  ISSUED: 'Emitida',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
}

const INVOICE_STATUS_CLASSES: Record<string, string> = {
  DRAFT:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ISSUED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-muted text-muted-foreground',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(n)
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className='text-xs text-muted-foreground mb-0.5'>{label}</p>
      <p className='text-sm'>{value || '—'}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── Checkpoint Drawer ────────────────────────────────────────────────────────

interface CheckpointDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrderId: string
  checkpoint?: WorkOrderCheckpoint
}

function CheckpointDrawer({
  open,
  onOpenChange,
  workOrderId,
  checkpoint,
}: CheckpointDrawerProps) {
  const isEdit = !!checkpoint
  const create = useCreateCheckpoint(workOrderId)
  const update = useUpdateCheckpoint(workOrderId)
  const isPending = create.isPending || update.isPending

  const form = useForm<{
    type: 'RECEPTION' | 'PROCESS' | 'DELIVERY'
    processType: string
    generalCondition: string
    note: string
  }>({
    defaultValues: {
      type: 'RECEPTION',
      processType: '',
      generalCondition: 'GOOD',
      note: '',
    },
  })

  const watchedType = useWatch({ control: form.control, name: 'type' })

  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [checkpointError, setCheckpointError] = useState<string | null>(null)

  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [photos])

  useEffect(() => {
    if (open) {
      form.reset({
        type: checkpoint?.type ?? 'RECEPTION',
        processType: checkpoint?.processType ?? '',
        generalCondition: checkpoint?.generalCondition ?? 'GOOD',
        note: checkpoint?.note ?? '',
      })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhotos([])

      setCheckpointError(null)
    }
  }, [open, checkpoint, form])

  async function handleSave() {
    const { type, processType, generalCondition, note } = form.getValues()
    if (type === 'PROCESS' && !processType.trim()) return
    setCheckpointError(null)
    try {
      if (isEdit && checkpoint) {
        await update.mutateAsync({
          id: checkpoint.id,
          data: { note: note || undefined },
        })
      } else {
        await create.mutateAsync({
          type,
          processType: type === 'PROCESS' ? processType : undefined,
          generalCondition,
          note: note || undefined,
        })
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === 'checkpoint_already_exists') {
          setCheckpointError(
            'Ya existe un checkpoint de este tipo para esta orden.'
          )
        } else if (err.message === 'delivery_requires_reception') {
          setCheckpointError(
            'No se puede registrar la entrega sin haber registrado la recepción primero.'
          )
        } else {
          setCheckpointError('Ocurrió un error al guardar el checkpoint.')
        }
      } else {
        console.error(err)
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className='w-full sm:max-w-md overflow-y-auto'
        aria-describedby={undefined}
      >
        <SheetHeader className='mb-6'>
          <SheetTitle>
            {isEdit ? 'Editar checkpoint' : 'Agregar checkpoint'}
          </SheetTitle>
        </SheetHeader>

        <div className='flex flex-col gap-4'>
          {!isEdit && (
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>Tipo *</label>
              <select
                {...form.register('type')}
                disabled={isPending}
                className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
              >
                <option value='RECEPTION'>Recepción</option>
                <option value='PROCESS'>Proceso</option>
                <option value='DELIVERY'>Entrega</option>
              </select>
            </div>
          )}

          {!isEdit && watchedType === 'PROCESS' && (
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>¿Qué proceso? *</label>
              <input
                {...form.register('processType')}
                disabled={isPending}
                placeholder='Ej: Lavado, Aplicación de vinil, Pulido…'
                className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
              />
            </div>
          )}

          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium'>Condición general *</label>
            <select
              {...form.register('generalCondition')}
              disabled={isPending}
              className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
            >
              <option value='EXCELLENT'>Excelente</option>
              <option value='GOOD'>Bueno</option>
              <option value='FAIR'>Regular</option>
              <option value='POOR'>Malo</option>
            </select>
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium'>Notas</label>
            <textarea
              rows={4}
              {...form.register('note')}
              disabled={isPending}
              placeholder='Observaciones del checkpoint…'
              className='flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none'
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium'>Fotos</label>
            <label className='flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-4 py-5 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors'>
              <Camera size={20} className='text-muted-foreground' />
              <span className='text-xs text-muted-foreground'>
                Haz clic para agregar fotos
              </span>
              <input
                type='file'
                accept='image/*'
                multiple
                className='sr-only'
                disabled={isPending}
                onChange={e => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length) setPhotos(prev => [...prev, ...files])
                  e.target.value = ''
                }}
              />
            </label>
            {previews.length > 0 && (
              <div className='grid grid-cols-3 gap-2 mt-1'>
                {previews.map((url, i) => (
                  <div key={i} className='relative group aspect-square'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=''
                      className='w-full h-full object-cover rounded-md border border-border'
                    />
                    <button
                      type='button'
                      onClick={() =>
                        setPhotos(prev => prev.filter((_, j) => j !== i))
                      }
                      className='absolute top-1 right-1 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity'
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {checkpointError && (
            <p className='text-sm text-destructive flex items-center gap-1.5'>
              <AlertCircle size={14} />
              {checkpointError}
            </p>
          )}

          <div className='flex justify-end gap-3 pt-2'>
            <Button
              variant='outline'
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 size={16} className='animate-spin' />
                  Guardando…
                </>
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Agregar'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Invoice Drawer ───────────────────────────────────────────────────────────

interface InvoiceDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrderId: string
}

function InvoiceDrawer({
  open,
  onOpenChange,
  workOrderId,
}: InvoiceDrawerProps) {
  const createInvoice = useCreateInvoice()

  async function handleConfirm() {
    try {
      await createInvoice.mutateAsync({ workOrderId })
      onOpenChange(false)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className='w-full sm:max-w-md overflow-y-auto'
        aria-describedby={undefined}
      >
        <SheetHeader className='mb-6'>
          <SheetTitle>Crear factura</SheetTitle>
        </SheetHeader>

        <div className='space-y-6'>
          <p className='text-sm text-muted-foreground'>
            El folio y los totales de la factura (subtotal, IVA y total) se
            generan automáticamente a partir de la orden de trabajo completada.
            Confirma para emitir la factura.
          </p>

          <div className='flex justify-end gap-3 pt-2'>
            <Button
              type='button'
              variant='outline'
              disabled={createInvoice.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleConfirm}
              disabled={createInvoice.isPending}
            >
              {createInvoice.isPending ? (
                <>
                  <Loader2 size={16} className='animate-spin' />
                  Creando…
                </>
              ) : (
                'Crear factura'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    setRole(getUserRole())
  }, [])
  const canManage = ['OWNER', 'MANAGER'].includes(role ?? '')
  const canStart = ['OWNER', 'MANAGER', 'TECHNICIAN'].includes(role ?? '')

  const { data: wo, isLoading } = useWorkOrder(id)
  const { data: assignments } = useWorkOrderAssignments(id)
  const { data: checkpoints } = useCheckpoints(id)
  const { data: warranties } = useWorkOrderWarranties(
    wo?.status === 'COMPLETED' ? id : ''
  )
  const { data: invoice } = useWorkOrderInvoice(
    wo?.status === 'COMPLETED' ? id : ''
  )
  const { data: members } = useMembers()

  const transition = useTransitionWorkOrderStatus()
  const assignTech = useAssignTechnician(id)
  const unassignTech = useUnassignTechnician(id)
  const deleteCheckpoint = useDeleteCheckpoint(id)

  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [checkpointDrawerOpen, setCheckpointDrawerOpen] = useState(false)
  const [editCheckpoint, setEditCheckpoint] = useState<
    WorkOrderCheckpoint | undefined
  >()
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false)

  // Assignment form state
  const [assignFormOpen, setAssignFormOpen] = useState(false)
  const [assignAccountId, setAssignAccountId] = useState('')
  const [assignRole, setAssignRole] = useState<'LEAD' | 'ASSISTANT'>('LEAD')

  // Confirmation dialogs
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [unassignTarget, setUnassignTarget] =
    useState<WorkOrderAssignment | null>(null)
  const [deleteCheckpointTarget, setDeleteCheckpointTarget] =
    useState<WorkOrderCheckpoint | null>(null)

  async function doTransition(status: WorkOrderStatus) {
    try {
      await transition.mutateAsync({ id, status })
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    }
  }

  async function doAssign() {
    if (!assignAccountId) return
    try {
      await assignTech.mutateAsync({
        memberId: assignAccountId,
        role: assignRole,
      })
      setAssignAccountId('')
      setAssignRole('LEAD')
      setAssignFormOpen(false)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    }
  }

  async function confirmUnassign() {
    if (!unassignTarget) return
    try {
      await unassignTech.mutateAsync(unassignTarget.id)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setUnassignTarget(null)
    }
  }

  async function confirmDeleteCheckpoint() {
    if (!deleteCheckpointTarget) return
    try {
      await deleteCheckpoint.mutateAsync(deleteCheckpointTarget.id)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    } finally {
      setDeleteCheckpointTarget(null)
    }
  }

  // Confirm guard: need at least one assignment + RECEPTION checkpoint
  const hasAssignment = (assignments ?? []).length > 0
  const hasReceptionCheckpoint = (checkpoints ?? []).some(
    cp => cp.type === 'RECEPTION'
  )
  const canConfirmOrder = hasAssignment && hasReceptionCheckpoint

  // Complete guard: need at least 2 checkpoints
  const canCompleteOrder = (checkpoints ?? []).length >= 2

  // Members that are not already assigned
  const assignedIds = new Set((assignments ?? []).map(a => a.accountId))
  const memberOptions = (members ?? [])
    .filter(m => !assignedIds.has(m.account.id))
    .map(m => ({
      value: m.id,
      label: `${m.account.firstName} ${m.account.lastName}`,
    }))

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='h-5 w-64 bg-muted animate-pulse rounded' />
        <div className='h-8 w-48 bg-muted animate-pulse rounded' />
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

  if (!wo) {
    return (
      <div className='flex flex-col items-center justify-center py-24 gap-4'>
        <p className='text-muted-foreground'>Orden no encontrada.</p>
        <Button variant='outline' asChild>
          <Link href='/work-orders'>Volver a órdenes</Link>
        </Button>
      </div>
    )
  }

  const isCompleted = wo.status === 'COMPLETED'
  const isCancelled = wo.status === 'CANCELLED'

  return (
    <div className='flex flex-col gap-6'>
      {/* Breadcrumb */}
      <nav className='flex items-center gap-1 text-sm text-muted-foreground'>
        <Link
          href='/work-orders'
          className='hover:text-foreground transition-colors'
        >
          Órdenes de trabajo
        </Link>
        <ChevronRight size={14} />
        <span className='text-foreground font-medium font-mono text-xs'>
          {wo.folio}
        </span>
      </nav>

      {/* Header */}
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div className='flex items-center gap-3'>
          <h2 className='text-2xl font-bold text-foreground font-mono'>
            {wo.folio}
          </h2>
          <StatusBadge status={wo.status} />
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          {/* Transition buttons */}
          {wo.status === 'DRAFT' && canManage && (
            <>
              <Button
                size='sm'
                onClick={() => doTransition(WorkOrderStatus.CONFIRMED)}
                disabled={transition.isPending || !canConfirmOrder}
                title={
                  !canConfirmOrder
                    ? [
                        !hasAssignment && 'asigna un técnico',
                        !hasReceptionCheckpoint && 'registra la recepción',
                      ]
                        .filter(Boolean)
                        .join(' y ')
                    : undefined
                }
              >
                {transition.isPending ? (
                  <Loader2 size={14} className='animate-spin' />
                ) : null}
                Confirmar orden
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setCancelConfirmOpen(true)}
                disabled={transition.isPending}
              >
                Cancelar orden
              </Button>
              {!canConfirmOrder && (
                <p className='text-xs text-muted-foreground flex items-center gap-1 w-full mt-1'>
                  <AlertCircle size={12} />
                  Para confirmar:{' '}
                  {[
                    !hasAssignment && 'asigna un técnico',
                    !hasReceptionCheckpoint &&
                      'registra la recepción del vehículo',
                  ]
                    .filter(Boolean)
                    .join(' y ')}
                </p>
              )}
            </>
          )}

          {wo.status === 'CONFIRMED' && (
            <>
              {canStart && (
                <Button
                  size='sm'
                  onClick={() => doTransition(WorkOrderStatus.IN_PROGRESS)}
                  disabled={transition.isPending}
                >
                  {transition.isPending ? (
                    <Loader2 size={14} className='animate-spin' />
                  ) : null}
                  Iniciar trabajo
                </Button>
              )}
              {canManage && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setCancelConfirmOpen(true)}
                  disabled={transition.isPending}
                >
                  Cancelar orden
                </Button>
              )}
            </>
          )}

          {wo.status === 'IN_PROGRESS' && canManage && (
            <>
              <Button
                size='sm'
                onClick={() => doTransition(WorkOrderStatus.COMPLETED)}
                disabled={transition.isPending || !canCompleteOrder}
              >
                {transition.isPending ? (
                  <Loader2 size={14} className='animate-spin' />
                ) : null}
                Completar orden
              </Button>
              {!canCompleteOrder && (
                <p className='text-xs text-muted-foreground flex items-center gap-1 w-full mt-1'>
                  <AlertCircle size={12} />
                  Registra al menos 2 checkpoints para completar la orden
                </p>
              )}
              <Button
                size='sm'
                variant='outline'
                onClick={() => setCancelConfirmOpen(true)}
                disabled={transition.isPending}
              >
                Cancelar orden
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info section */}
      <section className='rounded-lg border border-border p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
            Información
          </h3>
          {wo.status === 'DRAFT' && canManage && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => setEditDrawerOpen(true)}
            >
              <Pencil size={14} />
              Editar
            </Button>
          )}
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <Field label='Tipo' value={TYPE_LABELS[wo.type] ?? wo.type} />
          <Field
            label='Cliente'
            value={`${wo.customer.firstName} ${wo.customer.lastName}`}
          />
          <div>
            <p className='text-xs text-muted-foreground mb-0.5'>Cliente</p>
            <Link
              href={`/customers/${wo.customerId}`}
              className='text-sm text-primary hover:underline'
            >
              {wo.customer.firstName} {wo.customer.lastName}
            </Link>
          </div>
          <Field
            label='Activo'
            value={[
              ASSET_TYPE_LABELS[wo.asset.assetType] ?? wo.asset.assetType,
              wo.asset.model,
              wo.asset.identifier ? `(${wo.asset.identifier})` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          <Field label='Fecha programada' value={formatDate(wo.scheduledAt)} />
          {isCompleted && (
            <Field
              label='Fecha completada'
              value={formatDate(wo.completedAt)}
            />
          )}
          <Field label='Creada' value={formatDate(wo.createdAt)} />
          {wo.note && (
            <div className='sm:col-span-2 lg:col-span-3'>
              <Field label='Notas' value={wo.note} />
            </div>
          )}
        </div>
      </section>

      {/* Items table */}
      <section className='flex flex-col gap-4'>
        <h3 className='text-base font-semibold'>Servicios</h3>
        <div className='overflow-x-auto rounded-md border border-border'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                  Servicio
                </th>
                <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                  Cant.
                </th>
                <th className='hidden sm:table-cell px-4 py-3 text-right font-medium text-muted-foreground'>
                  Precio unit.
                </th>
                <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                  Subtotal
                </th>
                <th className='hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground'>
                  Notas
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {wo.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className='px-4 py-10 text-center text-muted-foreground'
                  >
                    Sin servicios.
                  </td>
                </tr>
              ) : (
                wo.items.map(item => (
                  <tr key={item.id}>
                    <td className='px-4 py-3 font-medium'>
                      {item.serviceName}
                    </td>
                    <td className='px-4 py-3 text-right text-muted-foreground'>
                      {item.quantity}
                    </td>
                    <td className='hidden sm:table-cell px-4 py-3 text-right text-muted-foreground'>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className='px-4 py-3 text-right font-medium'>
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className='hidden md:table-cell px-4 py-3 text-muted-foreground'>
                      {item.note ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {wo.items.length > 0 && (
              <tfoot>
                <tr className='border-t border-border bg-muted/30'>
                  <td
                    colSpan={3}
                    className='px-4 py-3 text-right text-sm font-semibold'
                  >
                    Total
                  </td>
                  <td className='px-4 py-3 text-right text-sm font-bold'>
                    {formatCurrency(wo.total)}
                  </td>
                  <td className='hidden md:table-cell' />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Assignments section */}
      {!isCancelled && (
        <section className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-base font-semibold'>Técnicos asignados</h3>
            {canManage &&
              memberOptions.length > 0 &&
              (assignments ?? []).length < 5 &&
              !assignFormOpen && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setAssignFormOpen(true)}
                >
                  <UserPlus size={14} />
                  Agregar técnico
                </Button>
              )}
          </div>

          {canManage && assignFormOpen && (
            <div className='rounded-md border border-border p-4 flex flex-col gap-3'>
              <p className='text-sm font-medium'>Asignar técnico</p>
              {memberOptions.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  Todos los miembros ya están asignados a esta orden.
                </p>
              ) : (
                <div className='flex items-end gap-3 flex-wrap'>
                  <div className='flex-1 min-w-48'>
                    <label className='text-xs font-medium text-muted-foreground mb-1.5 block'>
                      Técnico
                    </label>
                    <Combobox
                      options={memberOptions}
                      value={assignAccountId}
                      onChange={setAssignAccountId}
                      placeholder='Seleccionar técnico…'
                      disabled={assignTech.isPending}
                    />
                  </div>
                  <div>
                    <label className='text-xs font-medium text-muted-foreground mb-1.5 block'>
                      Rol
                    </label>
                    <div className='relative'>
                      <select
                        value={assignRole}
                        onChange={e =>
                          setAssignRole(e.target.value as 'LEAD' | 'ASSISTANT')
                        }
                        disabled={assignTech.isPending}
                        className='h-10 cursor-pointer appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
                      >
                        <option value='LEAD'>Principal</option>
                        <option value='ASSISTANT'>Asistente</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className='absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground'
                      />
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      onClick={doAssign}
                      disabled={!assignAccountId || assignTech.isPending}
                    >
                      {assignTech.isPending ? (
                        <Loader2 size={14} className='animate-spin' />
                      ) : (
                        <UserPlus size={14} />
                      )}
                      Asignar
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setAssignFormOpen(false)
                        setAssignAccountId('')
                        setAssignRole('LEAD')
                      }}
                      disabled={assignTech.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!assignments || assignments.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Sin técnicos asignados.
            </p>
          ) : (
            <div className='flex flex-col gap-2'>
              {assignments.map(a => (
                <div
                  key={a.id}
                  className='flex items-center justify-between rounded-md border border-border px-4 py-3'
                >
                  <div>
                    <p className='text-sm font-medium'>
                      {a.account.firstName} {a.account.lastName}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {a.account.email}
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-xs rounded-full bg-muted px-2 py-0.5 font-medium'>
                      {ASSIGNMENT_ROLE_LABELS[a.role] ?? a.role}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => setUnassignTarget(a)}
                        className='p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Checkpoints section */}
      {!isCancelled && (
        <section className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-base font-semibold'>Checkpoints</h3>
            {canManage && (
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setEditCheckpoint(undefined)
                  setCheckpointDrawerOpen(true)
                }}
              >
                <Plus size={14} />
                Agregar checkpoint
              </Button>
            )}
          </div>

          {!checkpoints || checkpoints.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Sin checkpoints registrados.
            </p>
          ) : (
            <div className='flex flex-col gap-2'>
              {checkpoints.map(cp => (
                <div
                  key={cp.id}
                  className='flex items-start justify-between rounded-md border border-border px-4 py-3 gap-4'
                >
                  <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='text-xs rounded-full bg-muted px-2 py-0.5 font-medium w-fit'>
                        {CHECKPOINT_TYPE_LABELS[cp.type] ?? cp.type}
                      </span>
                      {cp.type === 'PROCESS' && cp.processType && (
                        <span className='text-xs text-foreground font-medium'>
                          {cp.processType}
                        </span>
                      )}
                    </div>
                    {cp.note && (
                      <p className='text-sm text-muted-foreground'>{cp.note}</p>
                    )}
                    <p className='text-xs text-muted-foreground'>
                      {formatDate(cp.createdAt)}
                    </p>
                  </div>
                  {canManage && (
                    <div className='flex items-center gap-1 shrink-0'>
                      <button
                        onClick={() => {
                          setEditCheckpoint(cp)
                          setCheckpointDrawerOpen(true)
                        }}
                        className='p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteCheckpointTarget(cp)}
                        className='p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Warranties section — COMPLETED only */}
      {isCompleted && (
        <section className='flex flex-col gap-4'>
          <h3 className='text-base font-semibold'>Garantías generadas</h3>

          {!warranties || warranties.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Ningún servicio generó garantía.
            </p>
          ) : (
            <div className='overflow-x-auto rounded-md border border-border'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/50'>
                  <tr>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Servicio
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Vigencia desde
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Vigencia hasta
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {warranties.map(w => (
                    <tr key={w.id}>
                      <td className='px-4 py-3 font-medium'>
                        {w.serviceName ?? w.serviceId}
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        {formatDate(w.validFrom)}
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        {formatDate(w.validUntil)}
                      </td>
                      <td className='px-4 py-3'>
                        {w.isVoid ? (
                          <span className='inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'>
                            Anulada
                          </span>
                        ) : (
                          <span className='inline-flex items-center rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-medium'>
                            Vigente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Invoice section — COMPLETED only */}
      {isCompleted && (
        <section className='rounded-lg border border-border p-6 flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
              Factura
            </h3>
            {!invoice && canManage && (
              <Button size='sm' onClick={() => setInvoiceDrawerOpen(true)}>
                <Plus size={14} />
                Crear factura
              </Button>
            )}
          </div>

          {!invoice ? (
            <p className='text-sm text-muted-foreground'>
              Aún no se ha generado una factura para esta orden.
            </p>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div>
                <p className='text-xs text-muted-foreground mb-0.5'>Folio</p>
                <p className='text-sm font-medium font-mono'>{invoice.folio}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground mb-0.5'>Subtotal</p>
                <p className='text-sm'>{formatCurrency(invoice.subtotal)}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground mb-0.5'>IVA</p>
                <p className='text-sm'>{formatCurrency(invoice.tax)}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground mb-0.5'>Total</p>
                <p className='text-sm font-bold'>
                  {formatCurrency(invoice.total)}
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground mb-0.5'>Status</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_CLASSES[invoice.status] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Drawers */}
      {wo.status === 'DRAFT' && (
        <WorkOrderEditDrawer
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
          workOrder={wo}
        />
      )}

      <CheckpointDrawer
        open={checkpointDrawerOpen}
        onOpenChange={open => {
          setCheckpointDrawerOpen(open)
          if (!open) setEditCheckpoint(undefined)
        }}
        workOrderId={id}
        checkpoint={editCheckpoint}
      />

      <InvoiceDrawer
        open={invoiceDrawerOpen}
        onOpenChange={setInvoiceDrawerOpen}
        workOrderId={id}
      />

      {/* Cancel transition confirmation */}
      <AlertDialog.Root
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Cancelar orden?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              La orden {wo.folio} pasará a status Cancelada. Esta acción no se
              puede deshacer.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>No, mantener</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant='destructive'
                  onClick={() => {
                    doTransition(WorkOrderStatus.CANCELLED)
                    setCancelConfirmOpen(false)
                  }}
                  disabled={transition.isPending}
                >
                  Cancelar orden
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Unassign confirmation */}
      <AlertDialog.Root
        open={!!unassignTarget}
        onOpenChange={o => !o && setUnassignTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Desasignar técnico?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              {unassignTarget?.account.firstName}{' '}
              {unassignTarget?.account.lastName} será removido de esta orden.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant='destructive'
                  onClick={confirmUnassign}
                  disabled={unassignTech.isPending}
                >
                  Desasignar
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Delete checkpoint confirmation */}
      <AlertDialog.Root
        open={!!deleteCheckpointTarget}
        onOpenChange={o => !o && setDeleteCheckpointTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50 animate-in fade-in-0' />
          <AlertDialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95'>
            <AlertDialog.Title className='text-lg font-semibold'>
              ¿Eliminar checkpoint?
            </AlertDialog.Title>
            <AlertDialog.Description className='mt-2 text-sm text-muted-foreground'>
              El checkpoint de{' '}
              {CHECKPOINT_TYPE_LABELS[
                deleteCheckpointTarget?.type ?? ''
              ]?.toLowerCase()}{' '}
              será eliminado permanentemente.
            </AlertDialog.Description>
            <div className='mt-6 flex justify-end gap-3'>
              <AlertDialog.Cancel asChild>
                <Button variant='outline'>Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant='destructive'
                  onClick={confirmDeleteCheckpoint}
                  disabled={deleteCheckpoint.isPending}
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
