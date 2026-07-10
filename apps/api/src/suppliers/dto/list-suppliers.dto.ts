import { createZodDto } from 'nestjs-zod'

import { ListSuppliersQuerySchema } from '@glossops/shared'

export class ListSuppliersDto extends createZodDto(ListSuppliersQuerySchema) {}
