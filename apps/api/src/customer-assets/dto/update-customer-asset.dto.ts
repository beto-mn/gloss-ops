import { PartialType } from '@nestjs/swagger'

import { CreateCustomerAssetDto } from './create-customer-asset.dto'

export class UpdateCustomerAssetDto extends PartialType(
  CreateCustomerAssetDto
) {}
