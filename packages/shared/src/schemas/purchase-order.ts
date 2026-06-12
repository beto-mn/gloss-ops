import { z } from 'zod'

import { PurchaseOrderStatus } from '../enums'
import { createPageSchema } from './pagination'

export const PurchaseOrderItemSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  inventoryId: z.string(),
  quantity: z.coerce.number(),
  receivedQuantity: z.coerce.number(),
  unitCost: z.coerce.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
})

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
  items: z.array(PurchaseOrderItemSchema),
})

export const PurchaseOrderPageSchema = createPageSchema(PurchaseOrderSchema)

export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>
export type PurchaseOrderPage = z.infer<typeof PurchaseOrderPageSchema>
