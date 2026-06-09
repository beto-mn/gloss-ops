import { z } from 'zod'

import { ResourceStatus } from '../enums'

export const CustomerListItemSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.nativeEnum(ResourceStatus),
  activeWorkOrderCount: z.number(),
  createdAt: z.string(),
})

export const CustomerSchema = CustomerListItemSchema.extend({
  address: z.string().nullable(),
  taxId: z.string().nullable(),
  fiscalRegime: z.string().nullable(),
  zipCode: z.string().nullable(),
  source: z.string().nullable(),
  note: z.string().nullable(),
  updatedAt: z.string(),
})

export type CustomerListItem = z.infer<typeof CustomerListItemSchema>
export type Customer = z.infer<typeof CustomerSchema>
