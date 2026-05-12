import type { Prisma } from '@glossops/database'

import type { InventoryRecord } from './inventory.repository.interface'

export interface CreateInventoryItemData {
  branchId: string
  supplierId?: string
  brandId?: string
  name: string
  unitCost?: number
  sku?: string
  description?: string
  stock?: number
  unit: string
  lowStockAlert?: number
}

export interface UpdateInventoryItemData {
  name?: string
  supplierId?: string | null
  brandId?: string | null
  unitCost?: number
  sku?: string | null
  description?: string | null
  stock?: number
  unit?: string
  lowStockAlert?: number | null
}

export interface InventoryItemRepositoryInterface {
  create(data: CreateInventoryItemData): Promise<InventoryRecord>
  update(
    id: string,
    branchId: string,
    data: UpdateInventoryItemData
  ): Promise<InventoryRecord>
  delete(id: string, branchId: string): Promise<void>
  decrementStock(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.InventoryItemModel>
}
