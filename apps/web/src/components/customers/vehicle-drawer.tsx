'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { BrandPicker } from '@/components/ui/brand-picker'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  createVehicleSchema,
  ASSET_TYPES,
} from '@/lib/schemas/customer-asset.schema'
import { ApiError } from '@/lib/api-client'
import { useCreateAsset, useUpdateAsset } from '@/hooks/use-customer-assets'
import { useBrands } from '@/hooks/use-brands'
import type {
  CreateVehicleValues,
  CustomerAsset,
  AssetType,
} from '@/lib/schemas/customer-asset.schema'

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

const COUNTRIES: { value: string; label: string }[] = [
  { value: 'MX', label: 'MX — México' },
  { value: 'AR', label: 'AR — Argentina' },
  { value: 'BO', label: 'BO — Bolivia' },
  { value: 'BR', label: 'BR — Brasil' },
  { value: 'CA', label: 'CA — Canadá' },
  { value: 'CL', label: 'CL — Chile' },
  { value: 'CO', label: 'CO — Colombia' },
  { value: 'CR', label: 'CR — Costa Rica' },
  { value: 'CU', label: 'CU — Cuba' },
  { value: 'DO', label: 'DO — Rep. Dominicana' },
  { value: 'EC', label: 'EC — Ecuador' },
  { value: 'GT', label: 'GT — Guatemala' },
  { value: 'HN', label: 'HN — Honduras' },
  { value: 'NI', label: 'NI — Nicaragua' },
  { value: 'PA', label: 'PA — Panamá' },
  { value: 'PE', label: 'PE — Perú' },
  { value: 'PR', label: 'PR — Puerto Rico' },
  { value: 'PY', label: 'PY — Paraguay' },
  { value: 'SV', label: 'SV — El Salvador' },
  { value: 'US', label: 'US — Estados Unidos' },
  { value: 'UY', label: 'UY — Uruguay' },
  { value: 'VE', label: 'VE — Venezuela' },
]

const ASSET_TYPE_OPTIONS = [...ASSET_TYPES]
  .sort((a, b) =>
    ASSET_TYPE_LABELS[a].localeCompare(ASSET_TYPE_LABELS[b], 'es')
  )
  .map(t => ({ value: t, label: ASSET_TYPE_LABELS[t] }))

interface VehicleDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  asset?: CustomerAsset
}

const defaultValues = {
  assetType: '' as AssetType,
  customAssetType: '',
  brandId: '',
  model: '',
  year: undefined as number | undefined,
  identifier: '',
  country: '',
  color: '',
  note: '',
}

export function VehicleDrawer({
  open,
  onOpenChange,
  customerId,
  asset,
}: VehicleDrawerProps) {
  const isEdit = !!asset
  const createAsset = useCreateAsset(customerId)
  const updateAsset = useUpdateAsset(customerId)
  const isPending = createAsset.isPending || updateAsset.isPending

  const form = useForm<CreateVehicleValues>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues,
  })

  const watchedType = form.watch('assetType') as AssetType
  const brandCategory = watchedType

  const { data: brands = [] } = useBrands(brandCategory, open)

  const brandOptions = useMemo(
    () => brands.map(b => ({ value: b.id, label: b.name, logoUrl: b.logoUrl })),
    [brands]
  )

  const skipBrandResetRef = useRef(false)

  useEffect(() => {
    if (open) {
      skipBrandResetRef.current = true
      form.reset(
        asset
          ? {
              assetType: asset.assetType,
              customAssetType: asset.customAssetType ?? '',
              brandId: asset.brandId ?? '',
              model: asset.model ?? '',
              year: asset.year ?? undefined,
              identifier: asset.identifier ?? '',
              country: asset.country ?? '',
              color: asset.color ?? '',
              note: asset.note ?? '',
            }
          : { ...defaultValues, year: new Date().getFullYear() }
      )
    }
  }, [open, asset, form])

  // Reset brandId when type changes, but skip on initial form open
  useEffect(() => {
    if (skipBrandResetRef.current) {
      skipBrandResetRef.current = false
      return
    }
    form.setValue('brandId', '')
  }, [watchedType, form])

  async function onSubmit(values: CreateVehicleValues) {
    const clean = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [
        k,
        v === '' || v === undefined ? undefined : v,
      ])
    ) as CreateVehicleValues

    try {
      if (isEdit) {
        await updateAsset.mutateAsync({ id: asset.id, data: clean })
      } else {
        await createAsset.mutateAsync(clean)
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        form.setError('root', {
          message: 'Ocurrió un error. Intenta de nuevo.',
        })
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className='w-full sm:max-w-lg overflow-y-auto'
        aria-describedby={undefined}
      >
        <SheetHeader className='mb-6'>
          <SheetTitle>
            {isEdit ? 'Editar vehículo' : 'Agregar vehículo'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {/* Tipo */}
            <FormField
              control={form.control}
              name='assetType'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={ASSET_TYPE_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='Buscar tipo…'
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === 'OTHER' && (
              <FormField
                control={form.control}
                name='customAssetType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo personalizado *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Dron, cuatrimoto…'
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Marca */}
            <FormField
              control={form.control}
              name='brandId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <BrandPicker
                      options={brandOptions}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder='Seleccionar marca…'
                      disabled={!watchedType || isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='model'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Civic, Ninja, etc.'
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='year'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='2023'
                        disabled={isPending}
                        {...field}
                        value={field.value ?? ''}
                        onChange={e =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='color'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Negro'
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='country'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Combobox
                        options={COUNTRIES}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder='Seleccionar…'
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='identifier'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placa / VIN / Identificador</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='3VWFE21C04M000001'
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder='Observaciones adicionales…'
                      disabled={isPending}
                      className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className='text-sm text-destructive'>
                {form.formState.errors.root.message}
              </p>
            )}

            <div className='flex justify-end gap-3 pt-2'>
              <Button
                type='button'
                variant='outline'
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 size={16} className='animate-spin' />
                    {isEdit ? 'Guardando…' : 'Agregando…'}
                  </>
                ) : isEdit ? (
                  'Guardar cambios'
                ) : (
                  'Agregar vehículo'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
