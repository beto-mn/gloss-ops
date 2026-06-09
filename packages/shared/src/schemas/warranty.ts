import { z } from 'zod'

export const WarrantySchema = z.object({
  id: z.string(),
  workOrderItemId: z.string(),
  serviceId: z.string(),
  serviceName: z.string().optional(),
  description: z.string(),
  term: z.string().nullable(),
  validFrom: z.string(),
  validUntil: z.string(),
  isVoid: z.boolean(),
  voidReason: z.string().nullable(),
  createdAt: z.string(),
})

export type Warranty = z.infer<typeof WarrantySchema>
