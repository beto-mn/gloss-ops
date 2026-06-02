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

export type WorkOrderItemWithService = Prisma.WorkOrderItemModel & {
  service: { id: string; name: string }
}

export type WorkOrderWithItems = Prisma.WorkOrderModel & {
  items: WorkOrderItemWithService[]
  asset: Prisma.CustomerAssetModel & {
    customer: Pick<Prisma.CustomerModel, 'id' | 'firstName' | 'lastName'>
    brand: Pick<Prisma.BrandModel, 'id' | 'name'> | null
  }
}

export interface WorkOrderDetailItem {
  id: string
  serviceId: string
  serviceName: string
  quantity: number
  unitPrice: number
  subtotal: number
  note: string | null
}

export interface WorkOrderDetail extends Prisma.WorkOrderModel {
  customerId: string
  total: number
  customer: Pick<Prisma.CustomerModel, 'id' | 'firstName' | 'lastName'>
  asset: {
    id: string
    assetType: string
    customAssetType: string | null
    model: string | null
    identifier: string
    brandName: string | null
  }
  items: WorkOrderDetailItem[]
}

export interface WorkOrderListItem extends Prisma.WorkOrderModel {
  customerId: string
  customer: Pick<Prisma.CustomerModel, 'id' | 'firstName' | 'lastName'>
  asset: {
    id: string
    assetType: string
    customAssetType: string | null
    model: string | null
    identifier: string
  }
}

export interface WorkOrderPage {
  data: WorkOrderListItem[]
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
