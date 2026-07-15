import { createZodDto } from 'nestjs-zod'

import { UpdateSupplierSchema } from '@glossops/shared'

export class UpdateSupplierDto extends createZodDto(UpdateSupplierSchema) {}
