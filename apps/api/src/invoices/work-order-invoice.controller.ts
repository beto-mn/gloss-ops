import { Controller, Get, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { InvoicesService } from './invoices.service'

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrderInvoiceController {
  constructor(private readonly service: InvoicesService) {}

  @Get(':workOrderId/invoice')
  @ApiOperation({ summary: 'Get the invoice for a specific work order' })
  findByWorkOrder(
    @Param('workOrderId') workOrderId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findByWorkOrder(workOrderId, account.branchId!)
  }
}
