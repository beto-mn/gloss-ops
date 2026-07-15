import { createZodDto } from 'nestjs-zod'

import { CreateCustomerAssetSchema } from '@glossops/shared'

export class CreateCustomerAssetDto extends createZodDto(
  CreateCustomerAssetSchema
) {}
