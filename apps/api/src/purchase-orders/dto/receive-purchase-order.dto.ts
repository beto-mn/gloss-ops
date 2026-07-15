import { createZodDto } from 'nestjs-zod'

import {
  ReceivePurchaseOrderSchema,
  ReceivePurchaseOrderItemSchema,
} from '@glossops/shared'

export class ReceiveItemDto extends createZodDto(
  ReceivePurchaseOrderItemSchema
) {}

export class ReceivePurchaseOrderDto extends createZodDto(
  ReceivePurchaseOrderSchema
) {}
