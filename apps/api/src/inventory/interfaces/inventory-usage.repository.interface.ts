import type { Prisma } from '@glossops/database'

export interface CreateInventoryUsageData {
  workOrderId: string
  inventoryId: string
  quantityUsed: number
  costAtUsage: number
}

export interface CommitUsagesResult {
  warnings: string[]
}

export interface InventoryUsageRepositoryInterface {
  create(data: CreateInventoryUsageData): Promise<Prisma.InventoryUsageModel>
  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel | null>
  findAllByWorkOrder(workOrderId: string): Promise<Prisma.InventoryUsageModel[]>
  findAllByInventory(inventoryId: string): Promise<Prisma.InventoryUsageModel[]>
  update(
    id: string,
    workOrderId: string,
    quantityUsed: Prisma.Decimal
  ): Promise<Prisma.InventoryUsageModel>
  deleteByWorkOrder(workOrderId: string): Promise<void>
  commitAll(workOrderId: string): Promise<CommitUsagesResult>
}
