import { createZodDto } from 'nestjs-zod'

import {
  CreatePurchaseOrderSchema,
  CreatePurchaseOrderItemSchema,
} from '@glossops/shared'

export class CreatePurchaseOrderItemDto extends createZodDto(
  CreatePurchaseOrderItemSchema
) {}

export class CreatePurchaseOrderDto extends createZodDto(
  CreatePurchaseOrderSchema
) {}
