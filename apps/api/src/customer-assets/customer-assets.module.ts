import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaCustomerAssetRepository } from './infrastructure/prisma-customer-asset.repository'
import { CustomerAssetsNestedController } from './customer-assets-nested.controller'
import { CustomerAssetsController } from './customer-assets.controller'
import { CustomerAssetsService } from './customer-assets.service'
import { CUSTOMER_ASSET_REPOSITORY } from './customer-assets.tokens'

@Module({
  imports: [PrismaModule],
  controllers: [CustomerAssetsController, CustomerAssetsNestedController],
  providers: [
    {
      provide: CUSTOMER_ASSET_REPOSITORY,
      useClass: PrismaCustomerAssetRepository,
    },
    CustomerAssetsService,
  ],
})
export class CustomerAssetsModule {}
