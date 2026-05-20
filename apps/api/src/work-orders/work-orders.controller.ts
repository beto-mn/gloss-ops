import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { WorkOrdersService } from './work-orders.service'
import {
  CreateWorkOrderDto,
  ListWorkOrdersDto,
  TransitionStatusDto,
  UpdateWorkOrderDto,
} from './dto'

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Create a new work order' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateWorkOrderDto
  ) {
    return this.service.create(
      account.branchId!,
      account.organizationId!,
      dto,
      account.sub
    )
  }

  @Get()
  @ApiOperation({ summary: 'List work orders for the organization' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListWorkOrdersDto
  ) {
    return this.service.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work order with its items' })
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Update work order metadata' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto
  ) {
    return this.service.update(id, account.organizationId!, dto)
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.MANAGER, Role.TECHNICIAN, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Transition work order status' })
  transition(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: TransitionStatusDto
  ) {
    return this.service.transition(
      id,
      account.organizationId!,
      dto.status,
      account.sub
    )
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a DRAFT work order' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.remove(id, account.organizationId!, account.sub)
  }
}
