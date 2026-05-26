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
import { createCustomerSchema } from '@/lib/schemas/customer.schema'
import { ApiError } from '@/lib/api-client'
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-customers'
import type {
  CreateCustomerValues,
  CustomerWithCount,
} from '@/lib/schemas/customer.schema'

interface CustomerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: CustomerWithCount
}

const defaultValues: CreateCustomerValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  fiscalRegime: '',
  zipCode: '',
  source: '',
  note: '',
}

export function CustomerDrawer({
  open,
  onOpenChange,
  customer,
}: CustomerDrawerProps) {
  const isEdit = !!customer
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const isPending = createCustomer.isPending || updateCustomer.isPending

  const form = useForm<CreateCustomerValues>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        customer
          ? {
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
              address: customer.address ?? '',
              taxId: customer.taxId ?? '',
              fiscalRegime: customer.fiscalRegime ?? '',
              zipCode: customer.zipCode ?? '',
              source: customer.source ?? '',
              note: customer.note ?? '',
            }
          : defaultValues
      )
    }
  }, [open, customer, form])

  async function onSubmit(values: CreateCustomerValues) {
    const clean = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as CreateCustomerValues

    try {
      if (isEdit) {
        await updateCustomer.mutateAsync({ id: customer.id, data: clean })
      } else {
        await createCustomer.mutateAsync(clean)
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.message === 'email_already_exists') {
        form.setError('email', { message: 'Este correo ya está registrado' })
      } else if (
        err instanceof ApiError &&
        err.message === 'phone_already_exists'
      ) {
        form.setError('phone', { message: 'Este teléfono ya está registrado' })
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
          <SheetTitle>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ana'
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
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='García'
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='ana@ejemplo.com'
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
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      type='tel'
                      placeholder='5551234567'
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
              name='address'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Calle, Colonia, Ciudad'
                      disabled={isPending}
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
                name='taxId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFC</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='XAXX010101000'
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
                name='zipCode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código postal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='06600'
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='fiscalRegime'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Régimen fiscal</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Persona física con actividad empresarial'
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
              name='source'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Instagram, referido, etc.'
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
                    {isEdit ? 'Guardando…' : 'Creando…'}
                  </>
                ) : isEdit ? (
                  'Guardar cambios'
                ) : (
                  'Crear cliente'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
