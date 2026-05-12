import type { InventoryType, Prisma } from '@glossops/database'

export interface InventoryQuery {
  type?: InventoryType
  supplierId?: string
  brandId?: string
  lowStock?: boolean
  page: number
  limit: number
}

export interface InventoryPageMeta {
  total: number
  totalPages: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export type InventoryRecord = Prisma.InventoryModel & {
  inventoryItem: Prisma.InventoryItemModel | null
  materialRoll: Prisma.MaterialRollModel | null
}

export interface InventoryPage {
  data: InventoryRecord[]
  meta: InventoryPageMeta
}

export interface InventoryRepositoryInterface {
  findById(id: string, branchId: string): Promise<InventoryRecord | null>
  findByIdDirect(id: string): Promise<InventoryRecord | null>
  findAll(branchId: string, query: InventoryQuery): Promise<InventoryPage>
  /** Returns true only if there are active (non-COMPLETED, non-CANCELLED) work order usages for this inventory. */
  hasActiveUsages(id: string): Promise<boolean>
}
