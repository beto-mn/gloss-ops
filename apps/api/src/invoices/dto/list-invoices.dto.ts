import { createZodDto } from 'nestjs-zod'

import { ListInvoicesQuerySchema } from '@glossops/shared'

export class ListInvoicesDto extends createZodDto(ListInvoicesQuerySchema) {}
