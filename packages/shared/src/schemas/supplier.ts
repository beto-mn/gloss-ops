import { z } from 'zod'

export const SupplierSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Supplier = z.infer<typeof SupplierSchema>
