import { Controller, Param, Query, Body, Post, Get } from '@nestjs/common'
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import type {
  CustomerAssetPage,
  CreateCustomerAssetData,
} from '@customer-assets/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateCustomerAssetDto, ListCustomerAssetsDto } from './dto'
import { CustomerAssetsService } from './customer-assets.service'

@ApiTags('Customer Assets')
@ApiBearerAuth()
@Controller('customers/:customerId/assets')
export class CustomerAssetsNestedController {
  constructor(private readonly service: CustomerAssetsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Create an asset for a customer' })
  create(
    @CurrentAccount() account: AuthContext,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerAssetDto
  ) {
    return this.service.create(
      account.organizationId!,
      customerId,
      dto as CreateCustomerAssetData
    )
  }

  @Get()
  @ApiOperation({ summary: 'List assets for a customer' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Param('customerId') customerId: string,
    @Query() dto: ListCustomerAssetsDto
  ): Promise<CustomerAssetPage> {
    return this.service.findAllByCustomer(
      account.organizationId!,
      customerId,
      dto
    )
  }
}
