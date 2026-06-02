'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCreateService, useUpdateService } from '@/hooks/use-services'
import { ApiError } from '@/lib/api-client'
import {
  createServiceSchema,
  type CreateServiceValues,
  type Service,
} from '@/lib/schemas/service.schema'

interface ServiceDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: Service
}

export function ServiceDrawer({
  open,
  onOpenChange,
  service,
}: ServiceDrawerProps) {
  const isEdit = !!service
  const create = useCreateService()
  const update = useUpdateService()
  const isPending = create.isPending || update.isPending

  const form = useForm<CreateServiceValues>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      name: '',
      description: '',
      basePrice: 0,
      warrantyDays: 0,
      claveProdServ: '',
      claveUnidad: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: service?.name ?? '',
        description: service?.description ?? '',
        basePrice: Number(service?.basePrice) || 0,
        warrantyDays: service?.warrantyDays ?? 0,
        claveProdServ: '',
        claveUnidad: '',
      })
    }
  }, [open, service, form])

  async function onSubmit(values: CreateServiceValues) {
    const clean = {
      ...values,
      description: values.description || undefined,
      claveProdServ: values.claveProdServ || undefined,
      claveUnidad: values.claveUnidad || undefined,
    }

    try {
      if (isEdit && service) {
        await update.mutateAsync({ id: service.id, data: clean })
      } else {
        await create.mutateAsync(clean)
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError('name', {
          message: 'Ya existe un servicio con este nombre',
        })
      } else if (!(err instanceof ApiError)) {
        console.error(err)
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
            {isEdit ? `Editar servicio` : 'Nuevo servicio'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Ej. Aplicación de vinilo completo'
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
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder='Descripción del servicio…'
                      disabled={isPending}
                      className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='basePrice'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio *</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        step={0.01}
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
                name='warrantyDays'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de garantía *</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        step={1}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='border-t border-border pt-4'>
              <p className='text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide'>
                Claves SAT (opcional)
              </p>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='claveProdServ'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clave Prod/Serv</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Ej. 78101801'
                          maxLength={15}
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
                  name='claveUnidad'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clave Unidad</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Ej. E48'
                          maxLength={10}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                    Guardando…
                  </>
                ) : isEdit ? (
                  'Guardar cambios'
                ) : (
                  'Crear servicio'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
