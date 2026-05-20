import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'
import { WorkOrdersModule } from '@work-orders'

import { PrismaAssetCheckpointRepository } from './infrastructure/prisma-asset-checkpoint.repository'
import { ASSET_CHECKPOINT_REPOSITORY } from './asset-checkpoints.tokens'
import { AssetCheckpointsController } from './asset-checkpoints.controller'
import { AssetCheckpointsService } from './asset-checkpoints.service'

@Module({
  imports: [PrismaModule, WorkOrdersModule],
  controllers: [AssetCheckpointsController],
  providers: [
    {
      provide: ASSET_CHECKPOINT_REPOSITORY,
      useClass: PrismaAssetCheckpointRepository,
    },
    AssetCheckpointsService,
  ],
})
export class AssetCheckpointsModule {}
