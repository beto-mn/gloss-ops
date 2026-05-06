import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaServiceRepository } from './infrastructure/prisma-service.repository'
import { ServicesController } from './services.controller'
import { ServicesService } from './services.service'
import { SERVICE_REPOSITORY } from './services.tokens'

@Module({
  imports: [PrismaModule],
  controllers: [ServicesController],
  providers: [
    { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository },
    ServicesService,
  ],
  exports: [ServicesService],
})
export class ServicesModule {}
