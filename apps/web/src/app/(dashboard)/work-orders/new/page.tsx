'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Combobox } from '@/components/ui/combobox'
import { useCreateWorkOrder } from '@/hooks/use-work-orders'
import { useCustomers, useCustomer } from '@/hooks/use-customers'
import { useCustomerAssets, useAsset } from '@/hooks/use-customer-assets'
import { useServices } from '@/hooks/use-services'
import { ApiError } from '@/lib/api-client'
import {
  WorkOrderType,
  createWorkOrderSchema,
  type CreateWorkOrderValues,
} from '@/lib/schemas/work-order.schema'

const TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Estándar' },
  { value: 'WARRANTY_CLAIM', label: 'Reclamación de garantía' },
]

const ASSET_TYPE_LABELS: Record<string, string> = {
  VEHICLE: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  BOAT: 'Embarcación',
  JET_SKI: 'Jet ski',
  TRUCK: 'Camión',
  OTHER: 'Otro',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(n)
}

export default function NewWorkOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const prefillCustomerId = searchParams.get('customerId') ?? ''
  const prefillAssetId = searchParams.get('assetId') ?? ''

  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  const [serviceSearch, setServiceSearch] = useState('')
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedServiceSearch(serviceSearch), 300)
    return () => clearTimeout(t)
  }, [serviceSearch])

  const form = useForm<CreateWorkOrderValues>({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: {
      customerId: prefillCustomerId,
      assetId: prefillAssetId,
      type: WorkOrderType.STANDARD,
      scheduledAt: '',
      note: '',
      items: [{ serviceId: '', quantity: 1, unitPrice: 0, note: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedCustomerId = useWatch({
    control: form.control,
    name: 'customerId',
  })
  const watchedItems = useWatch({ control: form.control, name: 'items' })

  const createWO = useCreateWorkOrder()

  // Customer search query (server-side)
  const { data: customersData } = useCustomers({
    search: debouncedCustomerSearch || undefined,
    limit: 20,
    status: 'ACTIVE',
  })

  // If prefilled, load the customer name for display
  const { data: prefillCustomer } = useCustomer(prefillCustomerId)

  // Assets for selected customer
  const { data: assetsData } = useCustomerAssets(watchedCustomerId)

  // If prefilled asset, load for display
  const { data: prefillAsset } = useAsset(prefillAssetId)

  // Services list — server-side search, same pattern as customers
  const { data: services, isLoading: servicesLoading } = useServices({
    search: debouncedServiceSearch || undefined,
    limit: 20,
  })

  const customerOptions = prefillCustomerId
    ? prefillCustomer
      ? [
          {
            value: prefillCustomer.id,
            label: `${prefillCustomer.firstName} ${prefillCustomer.lastName}`,
          },
        ]
      : []
    : (customersData?.data ?? []).map(c => ({
        value: c.id,
        label: `${c.firstName} ${c.lastName}`,
      }))

  const assetOptions = prefillAssetId
    ? prefillAsset
      ? [
          {
            value: prefillAsset.id,
            label:
              `${ASSET_TYPE_LABELS[prefillAsset.assetType] ?? prefillAsset.assetType} · ${prefillAsset.model ?? ''} ${prefillAsset.identifier ? `(${prefillAsset.identifier})` : ''}`.trim(),
          },
        ]
      : []
    : (assetsData?.data ?? []).map(a => ({
        value: a.id,
        label:
          `${ASSET_TYPE_LABELS[a.assetType] ?? a.assetType} · ${a.model ?? ''} ${a.identifier ? `(${a.identifier})` : ''}`.trim(),
      }))

  const serviceOptions = (services ?? []).map(s => ({
    value: s.id,
    label: s.name,
  }))

  const handleCustomerChange = useCallback(
    (value: string) => {
      form.setValue('customerId', value, { shouldValidate: true })
      if (!prefillAssetId) form.setValue('assetId', '')
    },
    [form, prefillAssetId]
  )

  // Calculate totals
  const subtotal = (watchedItems ?? []).reduce((acc, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unitPrice) || 0
    return acc + qty * price
  }, 0)

  async function onSubmit(values: CreateWorkOrderValues) {
    const clean: CreateWorkOrderValues = {
      ...values,
      scheduledAt: values.scheduledAt || undefined,
      note: values.note || undefined,
      items: values.items.map(item => ({
        ...item,
        note: item.note || undefined,
      })),
    }

    try {
      const wo = await createWO.mutateAsync(clean)
      router.push(`/work-orders/${wo.id}`)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    }
  }

  return (
    <div className='flex flex-col gap-6 max-w-3xl'>
      {/* Breadcrumb */}
      <nav className='flex items-center gap-1 text-sm text-muted-foreground'>
        <Link
          href='/work-orders'
          className='hover:text-foreground transition-colors'
        >
          Órdenes de trabajo
        </Link>
        <ChevronRight size={14} />
        <span className='text-foreground font-medium'>Nueva orden</span>
      </nav>

      <h2 className='text-2xl font-bold text-foreground'>
        Nueva orden de trabajo
      </h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex flex-col gap-8'
        >
          {/* Section: Datos principales */}
          <section className='rounded-lg border border-border p-6 flex flex-col gap-4'>
            <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
              Datos principales
            </h3>

            {/* Cliente */}
            <FormField
              control={form.control}
              name='customerId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={customerOptions}
                      value={field.value}
                      onChange={handleCustomerChange}
                      onSearch={
                        prefillCustomerId ? undefined : setCustomerSearch
                      }
                      placeholder='Buscar cliente…'
                      disabled={!!prefillCustomerId || createWO.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activo */}
            <FormField
              control={form.control}
              name='assetId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activo *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={assetOptions}
                      value={field.value}
                      onChange={val =>
                        form.setValue('assetId', val, { shouldValidate: true })
                      }
                      placeholder={
                        watchedCustomerId
                          ? 'Seleccionar activo…'
                          : 'Primero selecciona un cliente'
                      }
                      disabled={
                        !!prefillAssetId ||
                        !watchedCustomerId ||
                        createWO.isPending
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {/* Tipo */}
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        disabled={createWO.isPending}
                        className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        {TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fecha programada */}
              <FormField
                control={form.control}
                name='scheduledAt'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha programada</FormLabel>
                    <FormControl>
                      <Input
                        type='date'
                        min={(() => {
                          const d = new Date()
                          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        })()}
                        disabled={createWO.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nota */}
            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder='Observaciones generales de la orden…'
                      disabled={createWO.isPending}
                      className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Section: Items */}
          <section className='rounded-lg border border-border p-6 flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
                Servicios
              </h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  append({ serviceId: '', quantity: 1, unitPrice: 0, note: '' })
                }
                disabled={createWO.isPending}
              >
                <Plus size={14} />
                Agregar servicio
              </Button>
            </div>

            {form.formState.errors.items?.root && (
              <p className='text-sm text-destructive'>
                {form.formState.errors.items.root.message}
              </p>
            )}
            {form.formState.errors.items?.message && (
              <p className='text-sm text-destructive'>
                {form.formState.errors.items.message}
              </p>
            )}

            <div className='flex flex-col gap-3'>
              {fields.map((field, index) => {
                const qty = Number(watchedItems?.[index]?.quantity) || 0
                const price = Number(watchedItems?.[index]?.unitPrice) || 0
                const rowSubtotal = qty * price

                return (
                  <div
                    key={field.id}
                    className='rounded-md border border-border p-4 flex flex-col gap-3'
                  >
                    <div className='flex items-start gap-3'>
                      <div className='flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                        {/* Servicio */}
                        <div className='sm:col-span-3'>
                          <FormField
                            control={form.control}
                            name={`items.${index}.serviceId`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className='text-xs'>
                                  Servicio *
                                </FormLabel>
                                <FormControl>
                                  <Combobox
                                    options={serviceOptions}
                                    value={f.value}
                                    onChange={val => {
                                      f.onChange(val)
                                      // Reset price when service changes
                                      const svc = services?.find(
                                        s => s.id === val
                                      )
                                      if (svc) {
                                        form.setValue(
                                          `items.${index}.unitPrice`,
                                          Number(svc.basePrice)
                                        )
                                      }
                                    }}
                                    onSearch={setServiceSearch}
                                    placeholder={
                                      servicesLoading
                                        ? 'Cargando servicios…'
                                        : 'Seleccionar servicio…'
                                    }
                                    disabled={createWO.isPending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Cantidad */}
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className='text-xs'>
                                Cantidad *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  min={1}
                                  step={1}
                                  disabled={createWO.isPending}
                                  {...f}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Precio unitario */}
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className='text-xs'>
                                Precio unitario *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  min={0}
                                  step={0.01}
                                  disabled={createWO.isPending}
                                  {...f}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Subtotal (display only) */}
                        <div className='flex flex-col gap-1'>
                          <span className='text-xs font-medium'>Subtotal</span>
                          <span className='h-10 flex items-center text-sm font-medium text-foreground'>
                            {formatCurrency(rowSubtotal)}
                          </span>
                        </div>
                      </div>

                      {fields.length > 1 && (
                        <button
                          type='button'
                          onClick={() => remove(index)}
                          disabled={createWO.isPending}
                          className='mt-6 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50'
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Nota del item */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.note`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>
                            Nota del servicio
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Observación específica de este servicio…'
                              disabled={createWO.isPending}
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className='flex justify-end pt-2 border-t border-border'>
              <div className='text-right'>
                <p className='text-xs text-muted-foreground mb-0.5'>Total</p>
                <p className='text-xl font-bold text-foreground'>
                  {formatCurrency(subtotal)}
                </p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              disabled={createWO.isPending}
              onClick={() => router.push('/work-orders')}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={createWO.isPending}>
              {createWO.isPending ? (
                <>
                  <Loader2 size={16} className='animate-spin' />
                  Creando…
                </>
              ) : (
                'Crear orden'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
