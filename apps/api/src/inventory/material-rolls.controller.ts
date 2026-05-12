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

import { CreateMaterialRollDto, UpdateMaterialRollDto } from './dto'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory/material-rolls')
export class MaterialRollsController {
  constructor(private readonly service: InventoryService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a material roll' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateMaterialRollDto
  ) {
    return this.service.createRoll(account.branchId!, dto)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a material roll' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateMaterialRollDto
  ) {
    return this.service.updateRoll(id, account.branchId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a material roll' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.removeRoll(id, account.branchId!)
  }
}
