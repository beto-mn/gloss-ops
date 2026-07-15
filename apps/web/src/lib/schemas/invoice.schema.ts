import type { z } from 'zod'

import { CreateInvoiceSchema, InvoiceStatus } from '@glossops/shared'

export { CreateInvoiceSchema, InvoiceStatus }

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

/**
 * Web create-invoice form values. Single source of truth is the shared
 * `CreateInvoiceSchema` (`POST /invoices`). Totals are computed server-side
 * from the completed work order, so the form only submits `{ workOrderId }`
 * plus optional CFDI fields.
 */
export type CreateInvoiceValues = z.infer<typeof CreateInvoiceSchema>
