import { createZodDto } from 'nestjs-zod'

import { ListBrandsQuerySchema } from '@glossops/shared'

export class ListBrandsDto extends createZodDto(ListBrandsQuerySchema) {}
