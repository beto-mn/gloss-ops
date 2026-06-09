import { z } from 'zod'

import { WorkOrderStatus, WorkOrderType } from '@glossops/shared'

export { WorkOrderStatus, WorkOrderType }

export interface WorkOrder {
  id: string
  folio: string
  status: WorkOrderStatus
  type: WorkOrderType
  scheduledAt: string | null
  createdAt: string
  completedAt: string | null
}

export interface WorkOrderListItem extends WorkOrder {
  customer: {
    id: string
    firstName: string
    lastName: string
  }
  asset: {
    id: string
    assetType: string
    customAssetType: string | null
    model: string | null
    identifier: string | null
  }
}

export interface WorkOrderItem {
  id: string
  serviceId: string
  serviceName: string
  quantity: number
  unitPrice: number
  subtotal: number
  note: string | null
}

export interface WorkOrderAssignment {
  id: string
  memberId: string
  accountId: string
  role: 'LEAD' | 'ASSISTANT'
  account: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  assignedAt: string
}

export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'

export interface WorkOrderCheckpoint {
  id: string
  type: 'RECEPTION' | 'PROCESS' | 'DELIVERY'
  processType: string | null
  generalCondition: AssetCondition
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkOrderDetail extends WorkOrder {
  note: string | null
  customerId: string
  assetId: string
  customer: {
    id: string
    firstName: string
    lastName: string
  }
  asset: {
    id: string
    assetType: string
    customAssetType: string | null
    model: string | null
    identifier: string | null
    brandName: string | null
  }
  items: WorkOrderItem[]
  total: number
}

export interface WorkOrderPage {
  data: WorkOrderListItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface WorkOrderListParams {
  status?: WorkOrderStatus | 'ALL'
  assetId?: string
  customerId?: string
  search?: string
  page?: number
  limit?: number
}

export const createWorkOrderItemSchema = z.object({
  serviceId: z.string().min(1, 'Selecciona un servicio'),
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
  unitPrice: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  note: z.string().optional().or(z.literal('')),
})

export const createWorkOrderSchema = z.object({
  customerId: z.string().min(1, 'Selecciona un cliente'),
  assetId: z.string().min(1, 'Selecciona un activo'),
  type: z.nativeEnum(WorkOrderType),
  scheduledAt: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
  items: z
    .array(createWorkOrderItemSchema)
    .min(1, 'Agrega al menos un servicio'),
})

export const updateWorkOrderSchema = z.object({
  scheduledAt: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
})

export type CreateWorkOrderValues = z.infer<typeof createWorkOrderSchema>
export type UpdateWorkOrderValues = z.infer<typeof updateWorkOrderSchema>
export type CreateWorkOrderItemValues = z.infer<
  typeof createWorkOrderItemSchema
>
