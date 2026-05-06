import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaSupplierRepository } from './infrastructure/prisma-supplier.repository'
import { SuppliersController } from './suppliers.controller'
import { SuppliersService } from './suppliers.service'
import { SUPPLIER_REPOSITORY } from './suppliers.tokens'

@Module({
  imports: [PrismaModule],
  controllers: [SuppliersController],
  providers: [
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    SuppliersService,
  ],
  exports: [SuppliersService],
})
export class SuppliersModule {}
