import { createZodDto } from 'nestjs-zod'

import { ListCustomersQuerySchema } from '@glossops/shared'

export class ListCustomersDto extends createZodDto(ListCustomersQuerySchema) {}
