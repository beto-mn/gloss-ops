import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { ListInventoryDto } from './dto'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory for the branch' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListInventoryDto
  ) {
    return this.service.findAll(account.branchId!, dto)
  }

  @Get(':id/usages')
  @ApiOperation({ summary: 'List usages for an inventory item' })
  findUsages(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findUsages(id, account.branchId!)
  }
}
