import { createZodDto } from 'nestjs-zod'

import { CreateWorkOrderSchema } from '@glossops/shared'

export class CreateWorkOrderDto extends createZodDto(CreateWorkOrderSchema) {}
