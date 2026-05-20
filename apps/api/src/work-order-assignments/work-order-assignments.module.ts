import { Module } from '@nestjs/common'

import { ActivityLogsModule } from '@activity-logs'
import { WorkOrdersModule } from '@work-orders'
import { PrismaModule } from '@prisma'

import { PrismaWorkOrderAssignmentRepository } from './infrastructure/prisma-work-order-assignment.repository'
import { WORK_ORDER_ASSIGNMENT_REPOSITORY } from './work-order-assignments.tokens'
import { WorkOrderAssignmentsController } from './work-order-assignments.controller'
import { WorkOrderAssignmentsService } from './work-order-assignments.service'

@Module({
  imports: [PrismaModule, WorkOrdersModule, ActivityLogsModule],
  controllers: [WorkOrderAssignmentsController],
  providers: [
    {
      provide: WORK_ORDER_ASSIGNMENT_REPOSITORY,
      useClass: PrismaWorkOrderAssignmentRepository,
    },
    WorkOrderAssignmentsService,
  ],
})
export class WorkOrderAssignmentsModule {}
