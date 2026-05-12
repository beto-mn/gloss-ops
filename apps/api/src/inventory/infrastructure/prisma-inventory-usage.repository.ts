import { Injectable } from '@nestjs/common'

import { InventoryType, type Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InventoryUsageRepositoryInterface,
  CommitUsagesResult,
  CreateInventoryUsageData,
} from '@inventory/interfaces'

@Injectable()
export class PrismaInventoryUsageRepository implements InventoryUsageRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateInventoryUsageData): Promise<Prisma.InventoryUsageModel> {
    return this.prisma.inventoryUsage.create({
      data: {
        workOrderId: data.workOrderId,
        inventoryId: data.inventoryId,
        quantityUsed: data.quantityUsed,
        costAtUsage: data.costAtUsage,
      },
    })
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel | null> {
    return this.prisma.inventoryUsage.findFirst({ where: { id, workOrderId } })
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return this.prisma.inventoryUsage.findMany({ where: { workOrderId } })
  }

  findAllByInventory(
    inventoryId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return this.prisma.inventoryUsage.findMany({ where: { inventoryId } })
  }

  update(
    id: string,
    _workOrderId: string,
    quantityUsed: Prisma.Decimal
  ): Promise<Prisma.InventoryUsageModel> {
    return this.prisma.inventoryUsage.update({
      where: { id },
      data: { quantityUsed },
    })
  }

  async deleteByWorkOrder(workOrderId: string): Promise<void> {
    await this.prisma.inventoryUsage.deleteMany({ where: { workOrderId } })
  }

  async commitAll(workOrderId: string): Promise<CommitUsagesResult> {
    return this.prisma.$transaction(async tx => {
      const usages = await tx.inventoryUsage.findMany({
        where: { workOrderId },
      })
      const warnings: string[] = []

      for (const usage of usages) {
        const inv = await tx.inventory.findUnique({
          where: { id: usage.inventoryId },
          include: { inventoryItem: true, materialRoll: true },
        })
        if (!inv) continue

        if (inv.type === InventoryType.ITEM && inv.inventoryItem) {
          const updated = await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { stock: { decrement: usage.quantityUsed } },
          })
          if (Number(updated.stock) < 0) {
            warnings.push(
              `${inv.name}: stock insuficiente (${Number(updated.stock)} ${inv.inventoryItem.unit})`
            )
          } else if (
            inv.inventoryItem.lowStockAlert !== null &&
            updated.stock.lte(inv.inventoryItem.lowStockAlert)
          ) {
            warnings.push(
              `${inv.name}: stock bajo (${Number(updated.stock)} ${inv.inventoryItem.unit})`
            )
          }
        } else if (inv.type === InventoryType.ROLL && inv.materialRoll) {
          const updated = await tx.materialRoll.update({
            where: { id: inv.id },
            data: { remainingLength: { decrement: usage.quantityUsed } },
          })
          if (Number(updated.remainingLength) < 0) {
            warnings.push(
              `${inv.name}: longitud insuficiente (${Number(updated.remainingLength)}m)`
            )
          }
        }
      }

      return { warnings }
    })
  }
}
