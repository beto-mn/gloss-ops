import { ScheduleModule } from '@nestjs/schedule'
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaBranchRepository } from './infrastructure/prisma-branch.repository'
import { BranchCleanupService } from './branches.cleanup.service'
import { BranchesController } from './branches.controller'
import { BranchesService } from './branches.service'
import { BRANCH_REPOSITORY } from './branches.tokens'

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [BranchesController],
  providers: [
    { provide: BRANCH_REPOSITORY, useClass: PrismaBranchRepository },
    BranchesService,
    BranchCleanupService,
  ],
})
export class BranchesModule {}
