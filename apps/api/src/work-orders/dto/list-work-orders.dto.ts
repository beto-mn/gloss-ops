import { createZodDto } from 'nestjs-zod'

import { ListWorkOrdersQuerySchema } from '@glossops/shared'

export class ListWorkOrdersDto extends createZodDto(
  ListWorkOrdersQuerySchema
) {}
