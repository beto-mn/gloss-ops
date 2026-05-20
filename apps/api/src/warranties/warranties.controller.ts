import { Controller, HttpCode, Param, Body, Post, Get } from '@nestjs/common'
import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { VoidWarrantyDto } from './dto/void-warranty.dto'
import { WarrantyService } from './warranties.service'

@Controller('warranties')
export class WarrantiesController {
  constructor(private readonly service: WarrantyService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentAccount() account: AuthContext) {
    return this.service.findOne(id, account.organizationId!)
  }

  @Post(':id/void')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.MANAGER)
  void(
    @Param('id') id: string,
    @Body() dto: VoidWarrantyDto,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.void(
      id,
      dto.reason,
      account.organizationId!,
      account.sub
    )
  }
}
