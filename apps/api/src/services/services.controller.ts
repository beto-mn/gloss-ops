import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount } from '@auth/decorators'
import { Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateServiceDto, UpdateServiceDto, ListServicesDto } from './dto'
import { ServicesService } from './services.service'

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateServiceDto
  ) {
    return this.service.create(account.organizationId!, dto)
  }

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListServicesDto
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
    @Body() dto: UpdateServiceDto
  ) {
    return this.service.update(id, account.organizationId!, dto)
  }

  @Post(':id/activate')
  @Roles(Role.OWNER, Role.MANAGER)
  activate(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.activate(id, account.organizationId!)
  }

  @Post(':id/deactivate')
  @Roles(Role.OWNER, Role.MANAGER)
  deactivate(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.deactivate(id, account.organizationId!)
  }
}
