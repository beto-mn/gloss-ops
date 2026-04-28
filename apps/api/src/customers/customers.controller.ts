import {
  ForbiddenException,
  Controller,
  HttpCode,
  Delete,
  Param,
  Patch,
  Query,
  Body,
  Post,
  Get,
} from '@nestjs/common'
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import type { CustomerPage } from '@customers/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateCustomerDto, UpdateCustomerDto, ListCustomersDto } from './dto'
import { CustomersService } from './customers.service'

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Create a new customer' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateCustomerDto
  ): Promise<Prisma.CustomerModel> {
    return this.customersService.create(account.organizationId!, dto)
  }

  @Get()
  @ApiOperation({
    summary: 'List customers with optional search and pagination',
  })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListCustomersDto
  ): Promise<CustomerPage> {
    return this.customersService.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string
  ): Promise<Prisma.CustomerModel> {
    return this.customersService.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Update a customer' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto
  ): Promise<Prisma.CustomerModel> {
    return this.customersService.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({
    summary:
      'Soft-delete a customer. Pass ?permanent=true (Owner only) to hard delete.',
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
    return this.customersService.remove(
      id,
      account.organizationId!,
      isPermanent
    )
  }
}
