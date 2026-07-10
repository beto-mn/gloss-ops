import { createZodDto } from 'nestjs-zod'

import { UpdateWorkOrderItemSchema } from '@glossops/shared'

export class UpdateWorkOrderItemDto extends createZodDto(
  UpdateWorkOrderItemSchema
) {}
