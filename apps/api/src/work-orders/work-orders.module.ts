import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { InventoryModule } from '../inventory/inventory.module'
import { PrismaWorkOrderItemRepository } from './infrastructure/prisma-work-order-item.repository'
import { PrismaWorkOrderRepository } from './infrastructure/prisma-work-order.repository'
import { WorkOrderItemsController } from './work-order-items.controller'
import { WorkOrderUsagesController } from './work-order-usages.controller'
import { WorkOrdersController } from './work-orders.controller'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'
import { WorkOrdersService } from './work-orders.service'

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [
    WorkOrdersController,
    WorkOrderItemsController,
    WorkOrderUsagesController,
  ],
  providers: [
    { provide: WORK_ORDER_REPOSITORY, useClass: PrismaWorkOrderRepository },
    {
      provide: WORK_ORDER_ITEM_REPOSITORY,
      useClass: PrismaWorkOrderItemRepository,
    },
    WorkOrdersService,
  ],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
