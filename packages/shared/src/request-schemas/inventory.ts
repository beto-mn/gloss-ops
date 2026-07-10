import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Inventory record kind. Mirrors the Prisma `InventoryType` enum; kept as a
 * literal enum so `@glossops/shared` stays free of a `@glossops/database`
 * runtime dependency.
 */
export const InventoryTypeSchema = z.enum(['ITEM', 'ROLL'])

/**
 * Body schema for `POST /inventory/items`. Transform-free plain object. Field
 * constraints mirror the former `CreateInventoryItemDto`. The old
 * `maxDecimalPlaces` hints on `unitCost`/`stock`/`lowStockAlert` are enforced by
 * the `Decimal` columns at persistence, not here (see APPLY_LOG deviation note).
 */
export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1),
  supplierId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  unitCost: z.number().min(0).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  stock: z.number().min(0).optional(),
  unit: z.string().min(1),
  lowStockAlert: z.number().min(0).optional(),
})

/**
 * Body schema for `PATCH /inventory/items/:id`. NOT a plain `.partial()`:
 * `supplierId`, `brandId`, `sku`, `description`, and `lowStockAlert` are
 * `.nullable()` because the former DTO typed them `... | null` to allow clearing
 * (the service passes the DTO straight to Prisma `update`).
 */
export const UpdateInventoryItemSchema = z.object({
  name: z.string().min(1).optional(),
  supplierId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  unitCost: z.number().min(0).optional(),
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  stock: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  lowStockAlert: z.number().min(0).nullable().optional(),
})

/**
 * Body schema for `POST /inventory/rolls`. Transform-free plain object. Field
 * constraints mirror the former `CreateMaterialRollDto`; `width` requires
 * `> 0` (`@Min(0.001)`) and `remainingLength` `>= 0`.
 */
export const CreateMaterialRollSchema = z.object({
  name: z.string().min(1),
  supplierId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  unitCost: z.number().min(0).optional(),
  series: z.string().min(1),
  finish: z.string().min(1),
  color: z.string().min(1),
  width: z.number().min(0.001),
  remainingLength: z.number().min(0),
  lotNumber: z.string().optional(),
})

/**
 * Body schema for `PATCH /inventory/rolls/:id`. NOT a plain `.partial()`:
 * `supplierId`, `brandId`, and `lotNumber` are `.nullable()` to allow clearing
 * (matching the former `... | null` DTO fields).
 */
export const UpdateMaterialRollSchema = z.object({
  name: z.string().min(1).optional(),
  supplierId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  unitCost: z.number().min(0).optional(),
  series: z.string().min(1).optional(),
  finish: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  width: z.number().min(0.001).optional(),
  remainingLength: z.number().min(0).optional(),
  lotNumber: z.string().nullable().optional(),
})

/**
 * Body schema for the inventory usage update endpoint. Mirrors the former
 * `UpdateInventoryUsageDto` (`quantityUsed` required, `> 0`).
 */
export const UpdateInventoryUsageSchema = z.object({
  quantityUsed: z.number().min(0.001),
})

/**
 * Query schema for `GET /inventory`. Pagination coerces string inputs. The
 * `lowStock` flag reproduces the former class-transformer
 * `@Transform(({ value }) => value === 'true' || value === true)` boolean
 * coercion; the outer `.optional()` short-circuits when the param is absent
 * (→ `undefined`), matching the old `@IsOptional()` behavior.
 */
export const ListInventoryQuerySchema = createPageQuerySchema({
  type: InventoryTypeSchema.optional(),
  supplierId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  lowStock: z
    .union([z.string(), z.boolean()])
    .transform(value => value === 'true' || value === true)
    .optional(),
})

export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>
export type CreateMaterialRollInput = z.infer<typeof CreateMaterialRollSchema>
export type UpdateMaterialRollInput = z.infer<typeof UpdateMaterialRollSchema>
export type UpdateInventoryUsageInput = z.infer<
  typeof UpdateInventoryUsageSchema
>
export type ListInventoryQuery = z.infer<typeof ListInventoryQuerySchema>
