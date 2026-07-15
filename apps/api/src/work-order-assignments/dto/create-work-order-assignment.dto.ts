import { createZodDto } from 'nestjs-zod'

import { CreateWorkOrderAssignmentSchema } from '@glossops/shared'

export class CreateWorkOrderAssignmentDto extends createZodDto(
  CreateWorkOrderAssignmentSchema
) {}
