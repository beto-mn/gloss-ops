import { createZodDto } from 'nestjs-zod'

import { UpdateInvoiceSchema } from '@glossops/shared'

export class UpdateInvoiceDto extends createZodDto(UpdateInvoiceSchema) {}
