import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Body, Controller, HttpCode, Param, Patch } from '@nestjs/common'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { UpdateInventoryUsageDto } from '../inventory/dto'
import { InventoryService } from '../inventory/inventory.service'

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders/:workOrderId/usages')
export class WorkOrderUsagesController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Patch(':usageId')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.MANAGER, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Adjust quantity used for an inventory usage' })
  update(
    @CurrentAccount() _account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Param('usageId') usageId: string,
    @Body() dto: UpdateInventoryUsageDto
  ) {
    return this.inventoryService.updateUsage(
      workOrderId,
      usageId,
      dto.quantityUsed
    )
  }
}
