import { Injectable } from '@nestjs/common'

import { InventoryType, type Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  MaterialRollRepositoryInterface,
  InventoryRecord,
  CreateMaterialRollData,
  UpdateMaterialRollData,
} from '@inventory/interfaces'

@Injectable()
export class PrismaMaterialRollRepository implements MaterialRollRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMaterialRollData): Promise<InventoryRecord> {
    return this.prisma.$transaction(async tx => {
      const base = await tx.inventory.create({
        data: {
          branchId: data.branchId,
          supplierId: data.supplierId,
          brandId: data.brandId,
          type: InventoryType.ROLL,
          name: data.name,
          unitCost: data.unitCost ?? 0,
        },
      })
      const roll = await tx.materialRoll.create({
        data: {
          id: base.id,
          series: data.series,
          finish: data.finish,
          color: data.color,
          width: data.width,
          remainingLength: data.remainingLength,
          lotNumber: data.lotNumber,
        },
      })
      return { ...base, inventoryItem: null, materialRoll: roll }
    })
  }

  update(
    id: string,
    _branchId: string,
    data: UpdateMaterialRollData
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
      const roll = await tx.materialRoll.update({
        where: { id },
        data: {
          ...(data.series !== undefined && { series: data.series }),
          ...(data.finish !== undefined && { finish: data.finish }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.width !== undefined && { width: data.width }),
          ...(data.remainingLength !== undefined && {
            remainingLength: data.remainingLength,
          }),
          ...(data.lotNumber !== undefined && { lotNumber: data.lotNumber }),
        },
      })
      return { ...base, inventoryItem: null, materialRoll: roll }
    })
  }

  async delete(id: string, _branchId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.materialRoll.delete({ where: { id } }),
      this.prisma.inventory.delete({ where: { id } }),
    ])
  }

  decrementLength(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.MaterialRollModel> {
    return this.prisma.materialRoll.update({
      where: { id },
      data: { remainingLength: { decrement: quantity } },
    })
  }
}
