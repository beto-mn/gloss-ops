import { createZodDto } from 'nestjs-zod'

import { ListInventoryQuerySchema } from '@glossops/shared'

export class ListInventoryDto extends createZodDto(ListInventoryQuerySchema) {}
