import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory/items')
export class InventoryItemsController {
  constructor(private readonly service: InventoryService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create an inventory item' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateInventoryItemDto
  ) {
    return this.service.createItem(account.branchId!, dto)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update an inventory item' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto
  ) {
    return this.service.updateItem(id, account.branchId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete an inventory item' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.removeItem(id, account.branchId!)
  }
}
