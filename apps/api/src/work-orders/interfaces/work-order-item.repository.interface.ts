import type { Prisma } from '@glossops/database'

export interface CreateWorkOrderItemData {
  workOrderId: string
  serviceId: string
  description?: string
  quantity: number
  unitPrice: number
  discount: number
  isBillable: boolean
}

export interface UpdateWorkOrderItemData {
  serviceId?: string
  description?: string | null
  quantity?: number
  unitPrice?: number
  discount?: number
  isBillable?: boolean
}

export interface WorkOrderItemRepositoryInterface {
  create(data: CreateWorkOrderItemData): Promise<Prisma.WorkOrderItemModel>
  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel | null>
  findAllByWorkOrder(workOrderId: string): Promise<Prisma.WorkOrderItemModel[]>
  update(
    id: string,
    workOrderId: string,
    data: UpdateWorkOrderItemData
  ): Promise<Prisma.WorkOrderItemModel>
  delete(id: string, workOrderId: string): Promise<void>
}
