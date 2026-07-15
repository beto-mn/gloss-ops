import { createZodDto } from 'nestjs-zod'

import { UpdateBrandSchema } from '@glossops/shared'

export class UpdateBrandDto extends createZodDto(UpdateBrandSchema) {}
