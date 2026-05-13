import { Injectable } from '@nestjs/common'

import { PrismaService } from '@prisma'
import type {
  PurchaseOrderItemRepositoryInterface,
  PurchaseOrderItemRecord,
} from '@purchase-orders/interfaces'

@Injectable()
export class PrismaPurchaseOrderItemRepository implements PurchaseOrderItemRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findAllByOrder(purchaseOrderId: string): Promise<PurchaseOrderItemRecord[]> {
    return this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<PurchaseOrderItemRecord[]>
  }
}
