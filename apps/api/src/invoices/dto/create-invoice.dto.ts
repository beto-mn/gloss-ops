import { createZodDto } from 'nestjs-zod'

import { CreateInvoiceSchema } from '@glossops/shared'

export class CreateInvoiceDto extends createZodDto(CreateInvoiceSchema) {}
