import { createZodDto } from 'nestjs-zod'

import { UpdateWorkOrderSchema } from '@glossops/shared'

export class UpdateWorkOrderDto extends createZodDto(UpdateWorkOrderSchema) {}
