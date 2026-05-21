import { Controller, Get, Param } from '@nestjs/common'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { WarrantyService } from './warranties.service'

@Controller('customer-assets/:assetId/warranties')
export class AssetWarrantiesController {
  constructor(private readonly service: WarrantyService) {}

  @Get()
  findAll(
    @Param('assetId') assetId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findByAsset(assetId, account.organizationId!)
  }
}
