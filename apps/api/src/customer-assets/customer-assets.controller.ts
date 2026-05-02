import {
  ForbiddenException,
  Controller,
  HttpCode,
  Delete,
  Param,
  Patch,
  Query,
  Body,
  Get,
} from '@nestjs/common'
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type { UpdateCustomerAssetData } from '@customer-assets/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { UpdateCustomerAssetDto } from './dto'
import { CustomerAssetsService } from './customer-assets.service'

@ApiTags('Customer Assets')
@ApiBearerAuth()
@Controller('customer-assets')
export class CustomerAssetsController {
  constructor(private readonly service: CustomerAssetsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer asset by ID' })
  findOne(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string
  ): Promise<Prisma.CustomerAssetModel> {
    return this.service.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Update a customer asset' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAssetDto
  ): Promise<Prisma.CustomerAssetModel> {
    return this.service.update(
      id,
      account.organizationId!,
      dto as UpdateCustomerAssetData
    )
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({
    summary:
      'Soft-delete a customer asset. Pass ?permanent=true (Owner only) to hard delete.',
  })
  remove(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Query('permanent') permanent?: string
  ): Promise<void> {
    const isPermanent = permanent === 'true'
    if (isPermanent && account.role !== Role.OWNER) {
      throw new ForbiddenException({ error: 'forbidden' })
    }
    return this.service.remove(id, account.organizationId!, isPermanent)
  }
}
