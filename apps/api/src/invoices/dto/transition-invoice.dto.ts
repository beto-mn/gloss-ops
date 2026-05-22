import { IsEnum } from 'class-validator'

import { InvoiceStatus } from '@glossops/database'

export class TransitionInvoiceDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus
}
