import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaInventoryItemRepository } from './infrastructure/prisma-inventory-item.repository'
import { PrismaInventoryUsageRepository } from './infrastructure/prisma-inventory-usage.repository'
import { PrismaInventoryRepository } from './infrastructure/prisma-inventory.repository'
import { PrismaMaterialRollRepository } from './infrastructure/prisma-material-roll.repository'
import { PrismaServiceDefaultsRepository } from './infrastructure/prisma-service-defaults.repository'
import { InventoryItemsController } from './inventory-items.controller'
import { MaterialRollsController } from './material-rolls.controller'
import {
  INVENTORY_ITEM_REPOSITORY,
  INVENTORY_REPOSITORY,
  INVENTORY_USAGE_REPOSITORY,
  MATERIAL_ROLL_REPOSITORY,
  SERVICE_DEFAULTS_REPOSITORY,
} from './inventory.tokens'
import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

@Module({
  imports: [PrismaModule],
  controllers: [
    InventoryController,
    InventoryItemsController,
    MaterialRollsController,
  ],
  providers: [
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
    {
      provide: INVENTORY_ITEM_REPOSITORY,
      useClass: PrismaInventoryItemRepository,
    },
    {
      provide: MATERIAL_ROLL_REPOSITORY,
      useClass: PrismaMaterialRollRepository,
    },
    {
      provide: INVENTORY_USAGE_REPOSITORY,
      useClass: PrismaInventoryUsageRepository,
    },
    {
      provide: SERVICE_DEFAULTS_REPOSITORY,
      useClass: PrismaServiceDefaultsRepository,
    },
    InventoryService,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
