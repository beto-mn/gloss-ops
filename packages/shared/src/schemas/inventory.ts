import { z } from 'zod'

import { InventoryType } from '../enums'

const InventoryBaseSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  supplierId: z.string().nullable(),
  brandId: z.string().nullable(),
  name: z.string(),
  unitCost: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const InventoryItemExtensionSchema = InventoryBaseSchema.extend({
  type: z.literal(InventoryType.ITEM),
  sku: z.string().nullable(),
  description: z.string().nullable(),
  stock: z.number(),
  unit: z.string(),
  lowStockAlert: z.number().nullable(),
})

const MaterialRollExtensionSchema = InventoryBaseSchema.extend({
  type: z.literal(InventoryType.ROLL),
  series: z.string(),
  finish: z.string(),
  color: z.string(),
  width: z.number(),
  remainingLength: z.number(),
  lotNumber: z.string().nullable(),
})

export const InventoryItemSchema = z.discriminatedUnion('type', [
  InventoryItemExtensionSchema,
  MaterialRollExtensionSchema,
])

export type InventoryItem = z.infer<typeof InventoryItemSchema>
