import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaInvoiceRepository } from './infrastructure/prisma-invoice.repository'
import { WorkOrderInvoiceController } from './work-order-invoice.controller'
import { ActivityLogsModule } from '../activity-logs/activity-logs.module'
import { WorkOrdersModule } from '../work-orders/work-orders.module'
import { InvoicesController } from './invoices.controller'
import { INVOICE_REPOSITORY } from './invoices.tokens'
import { InvoicesService } from './invoices.service'

@Module({
  imports: [PrismaModule, WorkOrdersModule, ActivityLogsModule],
  controllers: [InvoicesController, WorkOrderInvoiceController],
  providers: [
    { provide: INVOICE_REPOSITORY, useClass: PrismaInvoiceRepository },
    InvoicesService,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
