import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { InventoryModule } from '../inventory/inventory.module'
import { PrismaPurchaseOrderItemRepository } from './infrastructure/prisma-purchase-order-item.repository'
import { PrismaPurchaseOrderRepository } from './infrastructure/prisma-purchase-order.repository'
import { PurchaseOrdersController } from './purchase-orders.controller'
import {
  PURCHASE_ORDER_ITEM_REPOSITORY,
  PURCHASE_ORDER_REPOSITORY,
} from './purchase-orders.tokens'
import { PurchaseOrdersService } from './purchase-orders.service'

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [PurchaseOrdersController],
  providers: [
    {
      provide: PURCHASE_ORDER_REPOSITORY,
      useClass: PrismaPurchaseOrderRepository,
    },
    {
      provide: PURCHASE_ORDER_ITEM_REPOSITORY,
      useClass: PrismaPurchaseOrderItemRepository,
    },
    PurchaseOrdersService,
  ],
})
export class PurchaseOrdersModule {}
