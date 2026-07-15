import { createZodDto } from 'nestjs-zod'

import { UpdateAssetCheckpointSchema } from '@glossops/shared'

export class UpdateAssetCheckpointDto extends createZodDto(
  UpdateAssetCheckpointSchema
) {}
