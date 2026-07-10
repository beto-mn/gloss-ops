import { createZodDto } from 'nestjs-zod'

import { TransitionInvoiceSchema } from '@glossops/shared'

export class TransitionInvoiceDto extends createZodDto(
  TransitionInvoiceSchema
) {}
