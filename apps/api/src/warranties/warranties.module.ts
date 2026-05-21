import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaWarrantyRepository } from './infrastructure/prisma-warranty.repository'
import { WorkOrderWarrantiesController } from './work-order-warranties.controller'
import { ActivityLogsModule } from '../activity-logs/activity-logs.module'
import { AssetWarrantiesController } from './asset-warranties.controller'
import { WarrantiesController } from './warranties.controller'
import { WARRANTY_REPOSITORY } from './warranties.tokens'
import { WarrantyService } from './warranties.service'

@Module({
  imports: [PrismaModule, ActivityLogsModule],
  controllers: [
    WarrantiesController,
    WorkOrderWarrantiesController,
    AssetWarrantiesController,
  ],
  providers: [
    { provide: WARRANTY_REPOSITORY, useClass: PrismaWarrantyRepository },
    WarrantyService,
  ],
  exports: [WarrantyService],
})
export class WarrantiesModule {}
