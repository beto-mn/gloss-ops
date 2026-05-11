import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateWorkOrderItemDto, UpdateWorkOrderItemDto } from './dto'
import { WorkOrdersService } from './work-orders.service'

@ApiTags('Work Order Items')
@ApiBearerAuth()
@Controller('work-orders/:workOrderId/items')
export class WorkOrderItemsController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all items in a work order' })
  getItems(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string
  ) {
    return this.service.getItems(workOrderId, account.organizationId!)
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Add an item to a DRAFT work order' })
  addItem(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: CreateWorkOrderItemDto
  ) {
    return this.service.addItem(workOrderId, account.organizationId!, dto)
  }

  @Patch(':itemId')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Update an item in a DRAFT work order' })
  updateItem(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWorkOrderItemDto
  ) {
    return this.service.updateItem(
      workOrderId,
      itemId,
      account.organizationId!,
      dto
    )
  }

  @Delete(':itemId')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Remove an item from a DRAFT work order' })
  removeItem(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Param('itemId') itemId: string
  ) {
    return this.service.removeItem(workOrderId, itemId, account.organizationId!)
  }
}
