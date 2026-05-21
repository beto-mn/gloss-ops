import { Controller, Get, Param } from '@nestjs/common'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { WarrantyService } from './warranties.service'

@Controller('work-orders/:workOrderId/warranties')
export class WorkOrderWarrantiesController {
  constructor(private readonly service: WarrantyService) {}

  @Get()
  findAll(
    @Param('workOrderId') workOrderId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findByWorkOrder(workOrderId, account.organizationId!)
  }
}
