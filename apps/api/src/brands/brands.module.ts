import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaBrandRepository } from './infrastructure/prisma-brand.repository'
import { BrandsController } from './brands.controller'
import { BrandsService } from './brands.service'
import { BRAND_REPOSITORY } from './brands.tokens'

@Module({
  imports: [PrismaModule],
  controllers: [BrandsController],
  providers: [
    { provide: BRAND_REPOSITORY, useClass: PrismaBrandRepository },
    BrandsService,
  ],
  exports: [BrandsService],
})
export class BrandsModule {}
