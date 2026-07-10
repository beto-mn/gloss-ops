import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Invoice lifecycle. Mirrors the Prisma `InvoiceStatus` enum; kept as a literal
 * enum so `@glossops/shared` stays free of a `@glossops/database` runtime
 * dependency.
 */
export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'ISSUED',
  'PAID',
  'CANCELLED',
])

/** CFDI payment method. Mirrors the Prisma `CfdiPaymentMethod` enum. */
export const CfdiPaymentMethodSchema = z.enum(['PUE', 'PPD'])

/**
 * Body schema for `POST /invoices`. Transform-free plain object so `apps/web`
 * can reuse it for form values via `z.infer`. Field constraints mirror the
 * former class-validator `CreateInvoiceDto` (`workOrderId` required UUID; the
 * remaining CFDI fields are optional strings, `paymentMethod` the enum).
 */
export const CreateInvoiceSchema = z.object({
  workOrderId: z.string().uuid(),
  customerTaxId: z.string().optional(),
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
  customerZipCode: z.string().optional(),
  customerFiscalRegime: z.string().optional(),
  cfdiUse: z.string().optional(),
  paymentMethod: CfdiPaymentMethodSchema.optional(),
  paymentForm: z.string().optional(),
})

/**
 * Body schema for `PATCH /invoices/:id`. The former `UpdateInvoiceDto` is the
 * create shape minus `workOrderId`, with every field optional (all fields were
 * already `string | undefined`, no `null` clearing), so `.partial()` after
 * omitting `workOrderId` reproduces it exactly.
 */
export const UpdateInvoiceSchema = CreateInvoiceSchema.omit({
  workOrderId: true,
}).partial()

/**
 * Body schema for the invoice status transition endpoint. Mirrors the former
 * `TransitionInvoiceDto` (`status` required `InvoiceStatus` enum).
 */
export const TransitionInvoiceSchema = z.object({
  status: InvoiceStatusSchema,
})

/**
 * Query schema for `GET /invoices`. Pagination coerces string inputs; `status`
 * is the `InvoiceStatus` enum.
 */
export const ListInvoicesQuerySchema = createPageQuerySchema({
  status: InvoiceStatusSchema.optional(),
})

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>
export type TransitionInvoiceInput = z.infer<typeof TransitionInvoiceSchema>
export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuerySchema>
