import { createZodDto } from 'nestjs-zod'

import { CreateInventoryItemSchema } from '@glossops/shared'

export class CreateInventoryItemDto extends createZodDto(
  CreateInventoryItemSchema
) {}
