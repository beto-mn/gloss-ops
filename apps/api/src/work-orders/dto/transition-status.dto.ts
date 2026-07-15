import { createZodDto } from 'nestjs-zod'

import { TransitionWorkOrderStatusSchema } from '@glossops/shared'

export class TransitionStatusDto extends createZodDto(
  TransitionWorkOrderStatusSchema
) {}
