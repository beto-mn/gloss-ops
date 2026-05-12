import { Injectable } from '@nestjs/common'

import { InventoryType, WorkOrderStatus } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InventoryRepositoryInterface,
  InventoryRecord,
  InventoryPage,
  InventoryQuery,
} from '@inventory/interfaces'

@Injectable()
export class PrismaInventoryRepository implements InventoryRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, branchId: string): Promise<InventoryRecord | null> {
    return this.prisma.inventory.findFirst({
      where: { id, branchId },
      include: { inventoryItem: true, materialRoll: true },
    }) as Promise<InventoryRecord | null>
  }

  findByIdDirect(id: string): Promise<InventoryRecord | null> {
    return this.prisma.inventory.findUnique({
      where: { id },
      include: { inventoryItem: true, materialRoll: true },
    }) as Promise<InventoryRecord | null>
  }

  async findAll(
    branchId: string,
    query: InventoryQuery
  ): Promise<InventoryPage> {
    const where: Record<string, unknown> = { branchId }
    if (query.type) where.type = query.type
    if (query.supplierId) where.supplierId = query.supplierId
    if (query.brandId) where.brandId = query.brandId
    if (query.lowStock) where.type = InventoryType.ITEM

    const allData = await this.prisma.inventory.findMany({
      where,
      include: { inventoryItem: true, materialRoll: true },
      orderBy: { name: 'asc' },
    })

    let data = allData as InventoryRecord[]
    if (query.lowStock) {
      data = data.filter(
        r =>
          r.inventoryItem?.lowStockAlert !== null &&
          r.inventoryItem?.lowStockAlert !== undefined &&
          Number(r.inventoryItem.stock) <= Number(r.inventoryItem.lowStockAlert)
      )
    }

    const filteredTotal = data.length
    const totalPages =
      filteredTotal === 0 ? 0 : Math.ceil(filteredTotal / query.limit)
    const sliced = data.slice(
      (query.page - 1) * query.limit,
      query.page * query.limit
    )

    return {
      data: sliced,
      meta: {
        total: filteredTotal,
        totalPages,
        page: query.page,
        limit: query.limit,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    }
  }

  async hasActiveUsages(id: string): Promise<boolean> {
    const usage = await this.prisma.inventoryUsage.findFirst({
      where: {
        inventoryId: id,
        workOrder: {
          status: {
            notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
          },
        },
      },
    })
    return usage !== null
  }
}
