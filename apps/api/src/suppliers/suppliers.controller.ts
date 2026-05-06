import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateSupplierDto, UpdateSupplierDto, ListSuppliersDto } from './dto'
import { SuppliersService } from './suppliers.service'

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateSupplierDto
  ) {
    return this.service.create(account.organizationId!, dto)
  }

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListSuppliersDto
  ) {
    return this.service.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto
  ) {
    return this.service.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER)
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.remove(id, account.organizationId!)
  }
}
