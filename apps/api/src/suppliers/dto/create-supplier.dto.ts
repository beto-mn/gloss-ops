import { createZodDto } from 'nestjs-zod'

import { CreateSupplierSchema } from '@glossops/shared'

export class CreateSupplierDto extends createZodDto(CreateSupplierSchema) {}
