import { createZodDto } from 'nestjs-zod'

import { CreateWorkOrderItemSchema } from '@glossops/shared'

export class CreateWorkOrderItemDto extends createZodDto(
  CreateWorkOrderItemSchema
) {}
