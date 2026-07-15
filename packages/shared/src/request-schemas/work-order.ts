import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Work order lifecycle. Mirrors the Prisma `WorkOrderStatus` enum; kept as a
 * literal enum so `@glossops/shared` stays free of a `@glossops/database`
 * runtime dependency.
 */
export const WorkOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
])

/** Work order kind. Mirrors the Prisma `WorkOrderType` enum. */
export const WorkOrderTypeSchema = z.enum(['STANDARD', 'WARRANTY_CLAIM'])

/**
 * Inline item shape accepted inside `CreateWorkOrderSchema.items`. Mirrors the
 * former nested class-validator `CreateWorkOrderItemInlineDto`
 * (`serviceId`/`quantity`/`unitPrice`/`note`) — distinct from the standalone
 * `CreateWorkOrderItemSchema` used by the item sub-resource endpoints.
 */
export const CreateWorkOrderItemInlineSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0),
  note: z.string().optional(),
})

/**
 * Body schema for `POST /work-orders`. Transform-free plain object so `apps/web`
 * can reuse it for form values via `z.infer`. Field constraints mirror the
 * former class-validator `CreateWorkOrderDto`. `items` is the nested inline
 * array (`@ValidateNested({ each: true })`).
 */
export const CreateWorkOrderSchema = z.object({
  assetId: z.string().uuid(),
  type: WorkOrderTypeSchema.optional(),
  warrantyClaimId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  note: z.string().optional(),
  items: z.array(CreateWorkOrderItemInlineSchema).optional(),
})

/**
 * Body schema for `PATCH /work-orders/:id`. NOT a plain `.partial()`:
 * `scheduledAt` and `note` are `.nullable()` because the service distinguishes
 * `null` (clear the field) from `undefined` (no-op) — see
 * `work-orders.service.ts#update`. Preserves the former
 * `scheduledAt?: string | null` / `note?: string | null` clearing capability.
 */
export const UpdateWorkOrderSchema = z.object({
  scheduledAt: z.string().datetime().nullable().optional(),
  note: z.string().nullable().optional(),
})

/**
 * Body schema for the work order status transition endpoint
 * (`PATCH /work-orders/:id/status`). Mirrors the former `TransitionStatusDto`.
 */
export const TransitionWorkOrderStatusSchema = z.object({
  status: WorkOrderStatusSchema,
})

/**
 * Body schema for `POST /work-orders/:workOrderId/items`. Standalone item shape
 * (`serviceId`/`description`/`quantity`/`unitPrice`/`discount`/`isBillable`) —
 * distinct from the inline item embedded in `CreateWorkOrderSchema`.
 */
export const CreateWorkOrderItemSchema = z.object({
  serviceId: z.string().uuid(),
  description: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
  isBillable: z.boolean().optional(),
})

/**
 * Body schema for `PATCH /work-orders/:workOrderId/items/:itemId`. NOT a plain
 * `.partial()`: `description` is `.nullable()` because the former DTO typed it
 * `string | null` to allow clearing. The remaining fields are the optional
 * counterparts of the create shape.
 */
export const UpdateWorkOrderItemSchema = z.object({
  serviceId: z.string().uuid().optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  isBillable: z.boolean().optional(),
})

/**
 * Query schema for `GET /work-orders`. Pagination coerces string inputs; the
 * `status` filter is the `WorkOrderStatus` enum and `assetId` a UUID.
 */
export const ListWorkOrdersQuerySchema = createPageQuerySchema({
  status: WorkOrderStatusSchema.optional(),
  assetId: z.string().uuid().optional(),
})

export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>
export type UpdateWorkOrderInput = z.infer<typeof UpdateWorkOrderSchema>
export type TransitionWorkOrderStatusInput = z.infer<
  typeof TransitionWorkOrderStatusSchema
>
export type CreateWorkOrderItemInput = z.infer<typeof CreateWorkOrderItemSchema>
export type UpdateWorkOrderItemInput = z.infer<typeof UpdateWorkOrderItemSchema>
export type ListWorkOrdersQuery = z.infer<typeof ListWorkOrdersQuerySchema>
