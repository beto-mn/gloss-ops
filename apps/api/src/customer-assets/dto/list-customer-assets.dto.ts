import { createZodDto } from 'nestjs-zod'

import { ListCustomerAssetsQuerySchema } from '@glossops/shared'

export class ListCustomerAssetsDto extends createZodDto(
  ListCustomerAssetsQuerySchema
) {}
