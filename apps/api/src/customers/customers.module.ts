import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaCustomerRepository } from './infrastructure/prisma-customer.repository'
import { CustomersController } from './customers.controller'
import { CustomersService } from './customers.service'
import { CUSTOMER_REPOSITORY } from './customers.tokens'

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    CustomersService,
  ],
})
export class CustomersModule {}
