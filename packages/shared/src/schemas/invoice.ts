import { z } from 'zod'

import { InvoiceStatus } from '../enums'

export const InvoiceSchema = z.object({
  id: z.string(),
  folio: z.string(),
  workOrderId: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  status: z.nativeEnum(InvoiceStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Invoice = z.infer<typeof InvoiceSchema>
