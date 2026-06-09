import { z } from 'zod'

import { PurchaseOrderStatus } from '../enums'

export const PurchaseOrderSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  supplierId: z.string(),
  status: z.nativeEnum(PurchaseOrderStatus),
  expectedAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>
