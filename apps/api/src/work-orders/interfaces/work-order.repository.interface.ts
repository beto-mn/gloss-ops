import type { WorkOrderStatus, WorkOrderType, Prisma } from '@glossops/database'

export interface CreateWorkOrderData {
  branchId: string
  assetId: string
  type: WorkOrderType
  warrantyClaimId?: string
  scheduledAt?: Date
  note?: string
}

export interface UpdateWorkOrderData {
  scheduledAt?: Date | null
  note?: string | null
  totalAmount?: number
}

export interface WorkOrderQuery {
  status?: WorkOrderStatus
  assetId?: string
  page: number
  limit: number
}

export interface WorkOrderPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type WorkOrderWithItems = Prisma.WorkOrderModel & {
  items: Prisma.WorkOrderItemModel[]
}

export interface WorkOrderPage {
  data: Prisma.WorkOrderModel[]
  meta: WorkOrderPageMeta
}

export interface WorkOrderRepositoryInterface {
  create(data: CreateWorkOrderData): Promise<Prisma.WorkOrderModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<WorkOrderWithItems | null>
  findAll(organizationId: string, query: WorkOrderQuery): Promise<WorkOrderPage>
  update(
    id: string,
    organizationId: string,
    data: UpdateWorkOrderData
  ): Promise<Prisma.WorkOrderModel>
  updateStatus(
    id: string,
    organizationId: string,
    status: WorkOrderStatus,
    completedAt?: Date
  ): Promise<Prisma.WorkOrderModel>
  delete(id: string, organizationId: string): Promise<void>
}
