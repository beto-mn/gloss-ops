import { createZodDto } from 'nestjs-zod'

import { ListServicesQuerySchema } from '@glossops/shared'

export class ListServicesDto extends createZodDto(ListServicesQuerySchema) {}
