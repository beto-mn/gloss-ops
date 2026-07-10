import { createZodDto } from 'nestjs-zod'

import { ListPurchaseOrdersQuerySchema } from '@glossops/shared'

export class ListPurchaseOrdersDto extends createZodDto(
  ListPurchaseOrdersQuerySchema
) {}
