import { createZodDto } from 'nestjs-zod'

import { CreateBrandSchema } from '@glossops/shared'

export class CreateBrandDto extends createZodDto(CreateBrandSchema) {}
