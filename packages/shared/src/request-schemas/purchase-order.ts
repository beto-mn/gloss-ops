import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Purchase order lifecycle. Mirrors the Prisma `PurchaseOrderStatus` enum; kept
 * as a literal enum so `@glossops/shared` stays free of a `@glossops/database`
 * runtime dependency.
 */
export const PurchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
])

/**
 * Item shape accepted inside `CreatePurchaseOrderSchema.items`. Mirrors the
 * former nested `CreatePurchaseOrderItemDto` (`inventoryId`/`quantity`/
 * `unitCost`/`note`).
 */
export const CreatePurchaseOrderItemSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().min(0.001),
  unitCost: z.number().min(0),
  note: z.string().optional(),
})

/**
 * Body schema for `POST /purchase-orders`. Transform-free plain object. `items`
 * is the required nested array (`@ValidateNested({ each: true })`). Field
 * constraints mirror the former class-validator `CreatePurchaseOrderDto`.
 */
export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  expectedAt: z.string().datetime().optional(),
  note: z.string().optional(),
  items: z.array(CreatePurchaseOrderItemSchema),
})

/**
 * Body schema for `PATCH /purchase-orders/:id`. NOT a plain `.partial()`:
 * `expectedAt` and `note` are `.nullable()` because the former DTO typed them
 * `string | null` to allow clearing. `supplierId` is optional but non-null.
 */
export const UpdatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid().optional(),
  expectedAt: z.string().datetime().nullable().optional(),
  note: z.string().nullable().optional(),
})

/**
 * Item shape accepted inside `ReceivePurchaseOrderSchema.items`. Mirrors the
 * former nested `ReceiveItemDto` (`itemId`/`receivedQuantity`).
 */
export const ReceivePurchaseOrderItemSchema = z.object({
  itemId: z.string().uuid(),
  receivedQuantity: z.number().min(0.001),
})

/**
 * Body schema for the purchase order receive endpoint. Mirrors the former
 * `ReceivePurchaseOrderDto` (required nested `items` array).
 */
export const ReceivePurchaseOrderSchema = z.object({
  items: z.array(ReceivePurchaseOrderItemSchema),
})

/**
 * Query schema for `GET /purchase-orders`. Pagination coerces string inputs;
 * `status` is the `PurchaseOrderStatus` enum and `supplierId` a UUID.
 */
export const ListPurchaseOrdersQuerySchema = createPageQuerySchema({
  status: PurchaseOrderStatusSchema.optional(),
  supplierId: z.string().uuid().optional(),
})

export type CreatePurchaseOrderItemInput = z.infer<
  typeof CreatePurchaseOrderItemSchema
>
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>
export type ReceivePurchaseOrderItemInput = z.infer<
  typeof ReceivePurchaseOrderItemSchema
>
export type ReceivePurchaseOrderInput = z.infer<
  typeof ReceivePurchaseOrderSchema
>
export type ListPurchaseOrdersQuery = z.infer<
  typeof ListPurchaseOrdersQuerySchema
>
