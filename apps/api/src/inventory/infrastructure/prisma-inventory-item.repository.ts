import { Injectable } from '@nestjs/common'

import { InventoryType, Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InventoryItemRepositoryInterface,
  InventoryRecord,
  CreateInventoryItemData,
  UpdateInventoryItemData,
} from '@inventory/interfaces'

@Injectable()
export class PrismaInventoryItemRepository implements InventoryItemRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateInventoryItemData): Promise<InventoryRecord> {
    return this.prisma.$transaction(async tx => {
      const base = await tx.inventory.create({
        data: {
          branchId: data.branchId,
          supplierId: data.supplierId,
          brandId: data.brandId,
          type: InventoryType.ITEM,
          name: data.name,
          unitCost: data.unitCost ?? 0,
        },
      })
      const item = await tx.inventoryItem.create({
        data: {
          id: base.id,
          sku: data.sku,
          description: data.description,
          stock: data.stock ?? 0,
          unit: data.unit,
          lowStockAlert: data.lowStockAlert,
        },
      })
      return { ...base, inventoryItem: item, materialRoll: null }
    })
  }

  update(
    id: string,
    _branchId: string,
    data: UpdateInventoryItemData
  ): Promise<InventoryRecord> {
    return this.prisma.$transaction(async tx => {
      const base = await tx.inventory.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
          ...(data.brandId !== undefined && { brandId: data.brandId }),
          ...(data.unitCost !== undefined && { unitCost: data.unitCost }),
        },
      })
      const item = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...(data.sku !== undefined && { sku: data.sku }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.unit !== undefined && { unit: data.unit }),
          ...(data.lowStockAlert !== undefined && {
            lowStockAlert: data.lowStockAlert,
          }),
        },
      })
      return { ...base, inventoryItem: item, materialRoll: null }
    })
  }

  async delete(id: string, _branchId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.inventoryItem.delete({ where: { id } }),
      this.prisma.inventory.delete({ where: { id } }),
    ])
  }

  decrementStock(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.InventoryItemModel> {
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { stock: { decrement: quantity } },
    })
  }

  async incrementStock(
    id: string,
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id },
        data: { stock: { increment: quantity } },
      }),
      this.prisma.inventory.update({
        where: { id },
        data: { unitCost },
      }),
    ])
  }
}
