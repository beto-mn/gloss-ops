import { z } from 'zod'

import { CfdiPaymentMethod, InvoiceStatus, WorkOrderStatus } from '../enums'
import { createFlatPageSchema } from './pagination'

/**
 * Embedded snapshot of the linked work order included on every invoice
 * response (`workOrder` block returned by the API).
 */
export const InvoiceWorkOrderEmbedSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(WorkOrderStatus),
  totalAmount: z.coerce.number(),
  asset: z.object({
    id: z.string(),
    assetType: z.string(),
    model: z.string().nullable(),
    year: z.number().nullable(),
  }),
})

export const InvoiceSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  workOrderId: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  folio: z.string(),
  subtotal: z.coerce.number(),
  taxRate: z.coerce.number(),
  taxAmount: z.coerce.number(),
  total: z.coerce.number(),
  customerTaxId: z.string().nullable(),
  customerName: z.string().nullable(),
  customerAddress: z.string().nullable(),
  customerZipCode: z.string().nullable(),
  customerFiscalRegime: z.string().nullable(),
  cfdiUse: z.string().nullable(),
  paymentMethod: z.nativeEnum(CfdiPaymentMethod).nullable(),
  paymentForm: z.string().nullable(),
  cfdiUuid: z.string().nullable(),
  cfdiXml: z.string().nullable(),
  cfdiSealedAt: z.string().nullable(),
  issuedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  workOrder: InvoiceWorkOrderEmbedSchema,
})

export const InvoicePageSchema = createFlatPageSchema(InvoiceSchema)

export type InvoiceWorkOrderEmbed = z.infer<typeof InvoiceWorkOrderEmbedSchema>
export type Invoice = z.infer<typeof InvoiceSchema>
export type InvoicePage = z.infer<typeof InvoicePageSchema>
