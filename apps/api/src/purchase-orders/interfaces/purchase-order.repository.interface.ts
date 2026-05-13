import type { PurchaseOrderStatus, type Prisma } from '@glossops/database'

export interface PurchaseOrderItemRecord {
  id: string
  purchaseOrderId: string
  inventoryId: string
  quantity: Prisma.Decimal
  receivedQuantity: Prisma.Decimal
  unitCost: Prisma.Decimal
  note: string | null
  createdAt: Date
}

export interface PurchaseOrderWithItems {
  id: string
  branchId: string
  supplierId: string
  status: PurchaseOrderStatus
  expectedAt: Date | null
  receivedAt: Date | null
  note: string | null
  createdAt: Date
  updatedAt: Date
  items: PurchaseOrderItemRecord[]
}

export interface CreatePurchaseOrderItemData {
  inventoryId: string
  quantity: number
  unitCost: number
  note?: string
}

export interface CreatePurchaseOrderData {
  branchId: string
  supplierId: string
  expectedAt?: Date
  note?: string
  items: CreatePurchaseOrderItemData[]
}

export interface UpdatePurchaseOrderData {
  supplierId?: string
  expectedAt?: Date | null
  note?: string | null
}

export interface PurchaseOrderQuery {
  status?: PurchaseOrderStatus
  supplierId?: string
  page: number
  limit: number
}

export interface PurchaseOrderPageMeta {
  total: number
  totalPages: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PurchaseOrderPage {
  data: PurchaseOrderWithItems[]
  meta: PurchaseOrderPageMeta
}

export interface ReceiveItemUpdate {
  itemId: string
  newReceivedQuantity: Prisma.Decimal
}

export interface PurchaseOrderRepositoryInterface {
  create(data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems>
  findById(id: string, branchId: string): Promise<PurchaseOrderWithItems | null>
  findAll(
    branchId: string,
    query: PurchaseOrderQuery
  ): Promise<PurchaseOrderPage>
  update(
    id: string,
    branchId: string,
    data: UpdatePurchaseOrderData
  ): Promise<PurchaseOrderWithItems>
  delete(id: string, branchId: string): Promise<void>
  updateStatusAndItems(
    id: string,
    status: PurchaseOrderStatus,
    receivedAt: Date | null,
    items: ReceiveItemUpdate[]
  ): Promise<PurchaseOrderWithItems>
}
