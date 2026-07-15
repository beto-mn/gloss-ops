import { createZodDto } from 'nestjs-zod'

import { UpdateServiceSchema } from '@glossops/shared'

export class UpdateServiceDto extends createZodDto(UpdateServiceSchema) {}
