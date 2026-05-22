import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Body, Controller, HttpCode, Param, Patch } from '@nestjs/common'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { UpdateInventoryUsageDto } from '../inventory/dto'
import { InventoryService } from '../inventory/inventory.service'
import { WorkOrdersService } from './work-orders.service'

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders/:workOrderId/usages')
export class WorkOrderUsagesController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly workOrdersService: WorkOrdersService
  ) {}

  @Patch(':usageId')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.MANAGER, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Adjust quantity used for an inventory usage' })
  async update(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Param('usageId') usageId: string,
    @Body() dto: UpdateInventoryUsageDto
  ) {
    await this.workOrdersService.findOne(workOrderId, account.organizationId!)
    return this.inventoryService.updateUsage(
      workOrderId,
      usageId,
      dto.quantityUsed
    )
  }
}
