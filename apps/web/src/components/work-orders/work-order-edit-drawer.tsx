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
import { useUpdateWorkOrder } from '@/hooks/use-work-orders'
import { ApiError } from '@/lib/api-client'
import {
  updateWorkOrderSchema,
  type UpdateWorkOrderValues,
  type WorkOrderDetail,
} from '@/lib/schemas/work-order.schema'

interface WorkOrderEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrder: WorkOrderDetail
}

export function WorkOrderEditDrawer({
  open,
  onOpenChange,
  workOrder,
}: WorkOrderEditDrawerProps) {
  const update = useUpdateWorkOrder()

  const form = useForm<UpdateWorkOrderValues>({
    resolver: zodResolver(updateWorkOrderSchema),
    defaultValues: { scheduledAt: '', note: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        scheduledAt: workOrder.scheduledAt
          ? workOrder.scheduledAt.substring(0, 10)
          : '',
        note: workOrder.note ?? '',
      })
    }
  }, [open, workOrder, form])

  async function onSubmit(values: UpdateWorkOrderValues) {
    try {
      await update.mutateAsync({
        id: workOrder.id,
        data: {
          scheduledAt: values.scheduledAt || undefined,
          note: values.note || undefined,
        },
      })
      onOpenChange(false)
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className='w-full sm:max-w-lg overflow-y-auto'
        aria-describedby={undefined}
      >
        <SheetHeader className='mb-6'>
          <SheetTitle>Editar orden {workOrder.folio}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='scheduledAt'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha programada</FormLabel>
                  <FormControl>
                    <Input type='date' disabled={update.isPending} {...field} />
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
                      rows={4}
                      placeholder='Observaciones generales…'
                      disabled={update.isPending}
                      className='flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none'
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
                disabled={update.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type='submit' disabled={update.isPending}>
                {update.isPending ? (
                  <>
                    <Loader2 size={16} className='animate-spin' />
                    Guardando…
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
