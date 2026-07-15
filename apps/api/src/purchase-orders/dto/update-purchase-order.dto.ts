import { createZodDto } from 'nestjs-zod'

import { UpdatePurchaseOrderSchema } from '@glossops/shared'

export class UpdatePurchaseOrderDto extends createZodDto(
  UpdatePurchaseOrderSchema
) {}
