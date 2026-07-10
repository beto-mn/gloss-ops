import { createZodDto } from 'nestjs-zod'

import { VoidWarrantySchema } from '@glossops/shared'

export class VoidWarrantyDto extends createZodDto(VoidWarrantySchema) {}
