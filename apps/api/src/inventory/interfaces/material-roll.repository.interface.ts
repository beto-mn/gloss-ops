import type { Prisma } from '@glossops/database'

import type { InventoryRecord } from './inventory.repository.interface'

export interface CreateMaterialRollData {
  branchId: string
  supplierId?: string
  brandId?: string
  name: string
  unitCost?: number
  series: string
  finish: string
  color: string
  width: number
  remainingLength: number
  lotNumber?: string
}

export interface UpdateMaterialRollData {
  name?: string
  supplierId?: string | null
  brandId?: string | null
  unitCost?: number
  series?: string
  finish?: string
  color?: string
  width?: number
  remainingLength?: number
  lotNumber?: string | null
}

export interface MaterialRollRepositoryInterface {
  create(data: CreateMaterialRollData): Promise<InventoryRecord>
  update(
    id: string,
    branchId: string,
    data: UpdateMaterialRollData
  ): Promise<InventoryRecord>
  delete(id: string, branchId: string): Promise<void>
  decrementLength(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.MaterialRollModel>
  incrementLength(
    id: string,
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal
  ): Promise<void>
}
