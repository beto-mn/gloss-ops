import { Injectable } from '@nestjs/common'

import { PurchaseOrderStatus } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  PurchaseOrderRepositoryInterface,
  PurchaseOrderWithItems,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  PurchaseOrderQuery,
  PurchaseOrderPage,
  ReceiveItemUpdate,
} from '@purchase-orders/interfaces'

@Injectable()
export class PrismaPurchaseOrderRepository implements PurchaseOrderRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    items: { orderBy: { createdAt: 'asc' as const } },
  }

  create(data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems> {
    return this.prisma.purchaseOrder.create({
      data: {
        branchId: data.branchId,
        supplierId: data.supplierId,
        expectedAt: data.expectedAt,
        note: data.note,
        items: {
          create: data.items.map(i => ({
            inventoryId: i.inventoryId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            note: i.note,
          })),
        },
      },
      include: this.include,
    }) as Promise<PurchaseOrderWithItems>
  }

  findById(
    id: string,
    branchId: string
  ): Promise<PurchaseOrderWithItems | null> {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, branchId },
      include: this.include,
    }) as Promise<PurchaseOrderWithItems | null>
  }

  async findAll(
    branchId: string,
    query: PurchaseOrderQuery
  ): Promise<PurchaseOrderPage> {
    const where: Record<string, unknown> = { branchId }
    if (query.status) where.status = query.status
    if (query.supplierId) where.supplierId = query.supplierId

    const [total, data] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ])

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    return {
      data: data as PurchaseOrderWithItems[],
      meta: {
        total,
        totalPages,
        page: query.page,
        limit: query.limit,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    }
  }

  update(
    id: string,
    _branchId: string,
    data: UpdatePurchaseOrderData
  ): Promise<PurchaseOrderWithItems> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.expectedAt !== undefined && { expectedAt: data.expectedAt }),
        ...(data.note !== undefined && { note: data.note }),
      },
      include: this.include,
    }) as Promise<PurchaseOrderWithItems>
  }

  async delete(id: string, _branchId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      }),
      this.prisma.purchaseOrder.delete({ where: { id } }),
    ])
  }

  updateStatusAndItems(
    id: string,
    status: PurchaseOrderStatus,
    receivedAt: Date | null,
    items: ReceiveItemUpdate[]
  ): Promise<PurchaseOrderWithItems> {
    return this.prisma.$transaction(async tx => {
      for (const item of items) {
        await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: { receivedQuantity: item.newReceivedQuantity },
        })
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: { status, receivedAt },
        include: this.include,
      })
    }) as Promise<PurchaseOrderWithItems>
  }
}
