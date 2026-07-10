import { createZodDto } from 'nestjs-zod'

import { UpdateMaterialRollSchema } from '@glossops/shared'

export class UpdateMaterialRollDto extends createZodDto(
  UpdateMaterialRollSchema
) {}
