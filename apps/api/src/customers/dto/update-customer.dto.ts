import { createZodDto } from 'nestjs-zod'

import { UpdateCustomerSchema } from '@glossops/shared'

export class UpdateCustomerDto extends createZodDto(UpdateCustomerSchema) {}
