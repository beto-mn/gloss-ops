import { createZodDto } from 'nestjs-zod'

import { UpdateInventoryItemSchema } from '@glossops/shared'

export class UpdateInventoryItemDto extends createZodDto(
  UpdateInventoryItemSchema
) {}
