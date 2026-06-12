import { z } from 'zod'

import { ResourceStatus } from '../enums'
import { createPageSchema } from './pagination'

/**
 * Detail / create / update response shape.
 *
 * `GET /customers/:id`, `POST /customers`, `PATCH /customers/:id`, and
 * `PATCH /customers/:id/restore` all return the raw `Prisma.CustomerModel`.
 * It carries no `activeWorkOrderCount` — only the list endpoint computes
 * that field.
 */
export const CustomerSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  taxId: z.string().nullable(),
  fiscalRegime: z.string().nullable(),
  zipCode: z.string().nullable(),
  source: z.string().nullable(),
  note: z.string().nullable(),
  status: z.nativeEnum(ResourceStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Response shape returned by `POST /customers` — narrower than the detail
 * schema only in semantic name. Aliased to `CustomerSchema` because the
 * controller currently returns the same raw `Prisma.CustomerModel` for both.
 */
export const CustomerCreateResponseSchema = CustomerSchema

/**
 * List variant returned in `data: T[]` from `GET /customers`. Adds the
 * computed `activeWorkOrderCount` field.
 */
export const CustomerListItemSchema = CustomerSchema.extend({
  activeWorkOrderCount: z.number(),
})

export const CustomerPageSchema = createPageSchema(CustomerListItemSchema)

export type Customer = z.infer<typeof CustomerSchema>
export type CustomerCreateResponse = z.infer<
  typeof CustomerCreateResponseSchema
>
export type CustomerListItem = z.infer<typeof CustomerListItemSchema>
export type CustomerPage = z.infer<typeof CustomerPageSchema>
