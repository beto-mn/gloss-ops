import { z } from 'zod'

import { InventoryType } from '../enums'
import { createPageSchema } from './pagination'

/**
 * Class-table inheritance: `Inventory` is the base record. Discrete units live
 * in `inventoryItem`; roll-format materials in `materialRoll`. Both extension
 * fields are nullable — exactly one is populated per record depending on
 * `type`.
 */
export const InventoryItemExtensionSchema = z.object({
  id: z.string(),
  sku: z.string().nullable(),
  description: z.string().nullable(),
  stock: z.coerce.number(),
  unit: z.string(),
  lowStockAlert: z.coerce.number().nullable(),
})

export const MaterialRollExtensionSchema = z.object({
  id: z.string(),
  series: z.string(),
  finish: z.string(),
  color: z.string(),
  width: z.coerce.number(),
  remainingLength: z.coerce.number(),
  lotNumber: z.string().nullable(),
})

/**
 * Wrapper schema for the actual API payload: `Prisma.InventoryModel` plus the
 * nullable `inventoryItem` / `materialRoll` extension blocks.
 *
 * Returned by `POST /inventory/items`, `POST /inventory/material-rolls`,
 * `PATCH /inventory/items/:id`, `PATCH /inventory/material-rolls/:id`, and as
 * each entry in the `data` array of `GET /inventory`.
 */
export const InventoryRecordSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  supplierId: z.string().nullable(),
  brandId: z.string().nullable(),
  type: z.nativeEnum(InventoryType),
  name: z.string(),
  unitCost: z.coerce.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  inventoryItem: InventoryItemExtensionSchema.nullable(),
  materialRoll: MaterialRollExtensionSchema.nullable(),
})

/**
 * Backwards-compatible alias kept so any consumer still importing
 * `InventoryItemSchema` resolves to the canonical record shape.
 */
export const InventoryItemSchema = InventoryRecordSchema

export const InventoryPageSchema = createPageSchema(InventoryRecordSchema)

export type InventoryItemExtension = z.infer<
  typeof InventoryItemExtensionSchema
>
export type MaterialRollExtension = z.infer<typeof MaterialRollExtensionSchema>
export type InventoryRecord = z.infer<typeof InventoryRecordSchema>
export type InventoryItem = z.infer<typeof InventoryItemSchema>
export type InventoryPage = z.infer<typeof InventoryPageSchema>
