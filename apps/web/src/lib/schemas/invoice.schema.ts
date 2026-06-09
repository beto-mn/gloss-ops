import { z } from 'zod'

import { InvoiceStatus } from '@glossops/shared'

export { InvoiceStatus }

export interface Invoice {
  id: string
  folio: string
  workOrderId: string
  subtotal: number
  tax: number
  total: number
  status: InvoiceStatus
  createdAt: string
  updatedAt: string
}

export const createInvoiceSchema = z.object({
  workOrderId: z.string().min(1),
  subtotal: z.coerce.number().min(0, 'El subtotal no puede ser negativo'),
  tax: z.coerce.number().min(0, 'El impuesto no puede ser negativo'),
  total: z.coerce.number().min(0, 'El total no puede ser negativo'),
})

export type CreateInvoiceValues = z.infer<typeof createInvoiceSchema>
