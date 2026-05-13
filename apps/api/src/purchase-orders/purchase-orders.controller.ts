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
  Query,
} from '@nestjs/common'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import {
  CreatePurchaseOrderDto,
  ListPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto'
import { PurchaseOrdersService } from './purchase-orders.service'

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List purchase orders for the branch' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListPurchaseOrdersDto
  ) {
    return this.service.findAll(account.branchId!, dto)
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a purchase order' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreatePurchaseOrderDto
  ) {
    return this.service.create(account.branchId!, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a purchase order by id' })
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findOne(id, account.branchId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a purchase order header (DRAFT only)' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto
  ) {
    return this.service.update(id, account.branchId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a purchase order (DRAFT only)' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.remove(id, account.branchId!)
  }

  @Post(':id/receive')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Batch receive items for a purchase order' })
  receive(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto
  ) {
    return this.service.receive(id, account.branchId!, dto)
  }

  @Post(':id/cancel')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  cancel(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.cancel(id, account.branchId!)
  }
}
