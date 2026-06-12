import { z } from 'zod'

import {
  AssignmentRole,
  AssetCondition,
  CheckpointType,
  WorkOrderStatus,
  WorkOrderType,
} from '../enums'
import { createPageSchema } from './pagination'

export const WorkOrderItemSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number(),
  subtotal: z.coerce.number(),
  note: z.string().nullable(),
})

/**
 * Existing nested-account variant. Matches the controller's actual response
 * (which carries both flat `accountId` and the joined `account` block).
 *
 * The new `WorkOrderAssignmentResponseSchema` lives in
 * `./work-order-assignment.ts` and re-exports this shape under a name that
 * better describes the controller endpoint.
 */
export const WorkOrderAssignmentSchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  memberId: z.string(),
  accountId: z.string(),
  role: z.nativeEnum(AssignmentRole),
  account: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
  }),
  assignedAt: z.string(),
})

export const WorkOrderListItemSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  assetId: z.string(),
  customerId: z.string(),
  status: z.nativeEnum(WorkOrderStatus),
  type: z.nativeEnum(WorkOrderType),
  warrantyClaimId: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  totalAmount: z.coerce.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  customer: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  asset: z.object({
    id: z.string(),
    assetType: z.string(),
    customAssetType: z.string().nullable(),
    model: z.string().nullable(),
    identifier: z.string(),
  }),
})

export const WorkOrderDetailSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  assetId: z.string(),
  customerId: z.string(),
  status: z.nativeEnum(WorkOrderStatus),
  type: z.nativeEnum(WorkOrderType),
  warrantyClaimId: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  totalAmount: z.coerce.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  total: z.coerce.number(),
  customer: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  asset: z.object({
    id: z.string(),
    assetType: z.string(),
    customAssetType: z.string().nullable(),
    model: z.string().nullable(),
    identifier: z.string(),
    brandName: z.string().nullable(),
  }),
  items: z.array(WorkOrderItemSchema),
})

/**
 * Response shape returned by `POST /work-orders` and `PATCH /work-orders/:id`.
 *
 * Narrower than `WorkOrderDetailSchema`: the controller returns the raw
 * `Prisma.WorkOrderModel` (no nested customer/asset/items/computed total).
 */
export const WorkOrderCreateResponseSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  assetId: z.string(),
  warrantyClaimId: z.string().nullable(),
  status: z.nativeEnum(WorkOrderStatus),
  type: z.nativeEnum(WorkOrderType),
  scheduledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  totalAmount: z.coerce.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const WorkOrderCheckpointSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(CheckpointType),
  processType: z.string().nullable(),
  generalCondition: z.nativeEnum(AssetCondition),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const WorkOrderSchema = WorkOrderDetailSchema

export const WorkOrderPageSchema = createPageSchema(WorkOrderListItemSchema)

export type WorkOrderItem = z.infer<typeof WorkOrderItemSchema>
export type WorkOrderAssignment = z.infer<typeof WorkOrderAssignmentSchema>
export type WorkOrderListItem = z.infer<typeof WorkOrderListItemSchema>
export type WorkOrderDetail = z.infer<typeof WorkOrderDetailSchema>
export type WorkOrderCreateResponse = z.infer<
  typeof WorkOrderCreateResponseSchema
>
export type WorkOrderCheckpoint = z.infer<typeof WorkOrderCheckpointSchema>
export type WorkOrder = z.infer<typeof WorkOrderSchema>
export type WorkOrderPage = z.infer<typeof WorkOrderPageSchema>
