import { createZodDto } from 'nestjs-zod'

import { CreateMaterialRollSchema } from '@glossops/shared'

export class CreateMaterialRollDto extends createZodDto(
  CreateMaterialRollSchema
) {}
