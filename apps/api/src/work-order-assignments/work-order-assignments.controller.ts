import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common'
import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateWorkOrderAssignmentDto } from './dto/create-work-order-assignment.dto'
import { WorkOrderAssignmentsService } from './work-order-assignments.service'

@Controller('work-orders/:workOrderId/assignments')
export class WorkOrderAssignmentsController {
  constructor(private readonly service: WorkOrderAssignmentsService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Param('workOrderId') workOrderId: string,
    @Body() dto: CreateWorkOrderAssignmentDto,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.create(
      workOrderId,
      dto,
      account.sub,
      account.organizationId!
    )
  }

  @Get()
  findAll(
    @Param('workOrderId') workOrderId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findAll(workOrderId, account.organizationId!)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(
    @Param('workOrderId') workOrderId: string,
    @Param('id') id: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.remove(workOrderId, id, account.organizationId!)
  }
}
