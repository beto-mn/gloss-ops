import { createZodDto } from 'nestjs-zod'

import { ListActivityLogsQuerySchema } from '@glossops/shared'

export class ListActivityLogsDto extends createZodDto(
  ListActivityLogsQuerySchema
) {}
