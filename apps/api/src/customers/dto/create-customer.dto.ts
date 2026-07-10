import { createZodDto } from 'nestjs-zod'

import { CreateCustomerSchema } from '@glossops/shared'

export class CreateCustomerDto extends createZodDto(CreateCustomerSchema) {}
