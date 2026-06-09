import { z } from 'zod'

import {
  AssignmentRole,
  AssetCondition,
  CheckpointType,
  WorkOrderStatus,
  WorkOrderType,
} from '../enums'

export const WorkOrderItemSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
  note: z.string().nullable(),
})

export const WorkOrderAssignmentSchema = z.object({
  id: z.string(),
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
  folio: z.string(),
  status: z.nativeEnum(WorkOrderStatus),
  type: z.nativeEnum(WorkOrderType),
  scheduledAt: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
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
    identifier: z.string().nullable(),
  }),
})

export const WorkOrderDetailSchema = z.object({
  id: z.string(),
  folio: z.string(),
  status: z.nativeEnum(WorkOrderStatus),
  type: z.nativeEnum(WorkOrderType),
  scheduledAt: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  note: z.string().nullable(),
  customerId: z.string(),
  assetId: z.string(),
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
    identifier: z.string().nullable(),
    brandName: z.string().nullable(),
  }),
  items: z.array(WorkOrderItemSchema),
  total: z.number(),
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

export type WorkOrderItem = z.infer<typeof WorkOrderItemSchema>
export type WorkOrderAssignment = z.infer<typeof WorkOrderAssignmentSchema>
export type WorkOrderListItem = z.infer<typeof WorkOrderListItemSchema>
export type WorkOrderDetail = z.infer<typeof WorkOrderDetailSchema>
export type WorkOrderCheckpoint = z.infer<typeof WorkOrderCheckpointSchema>
export type WorkOrder = z.infer<typeof WorkOrderSchema>
