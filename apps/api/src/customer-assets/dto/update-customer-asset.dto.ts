import { createZodDto } from 'nestjs-zod'

import { UpdateCustomerAssetSchema } from '@glossops/shared'

export class UpdateCustomerAssetDto extends createZodDto(
  UpdateCustomerAssetSchema
) {}
