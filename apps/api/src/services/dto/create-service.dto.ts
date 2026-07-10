import { createZodDto } from 'nestjs-zod'

import { CreateServiceSchema } from '@glossops/shared'

export class CreateServiceDto extends createZodDto(CreateServiceSchema) {}
