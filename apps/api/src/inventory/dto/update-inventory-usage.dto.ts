import { createZodDto } from 'nestjs-zod'

import { UpdateInventoryUsageSchema } from '@glossops/shared'

export class UpdateInventoryUsageDto extends createZodDto(
  UpdateInventoryUsageSchema
) {}
