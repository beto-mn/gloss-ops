import { createZodDto } from 'nestjs-zod'

import { CreateAssetCheckpointSchema } from '@glossops/shared'

export class CreateAssetCheckpointDto extends createZodDto(
  CreateAssetCheckpointSchema
) {}
