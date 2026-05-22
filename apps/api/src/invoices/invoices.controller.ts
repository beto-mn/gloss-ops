import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { InvoicesService } from './invoices.service'
import {
  CreateInvoiceDto,
  ListInvoicesDto,
  TransitionInvoiceDto,
  UpdateInvoiceDto,
} from './dto'

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create an invoice for a completed work order' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateInvoiceDto
  ) {
    return this.service.create(
      account.branchId!,
      account.organizationId!,
      dto,
      account.sub
    )
  }

  @Get()
  @ApiOperation({ summary: 'List invoices for the branch' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListInvoicesDto
  ) {
    return this.service.findAll(account.branchId!, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail' })
  findOne(@Param('id') id: string, @CurrentAccount() account: AuthContext) {
    return this.service.findOne(id, account.branchId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update fiscal data on a DRAFT invoice' })
  update(
    @Param('id') id: string,
    @CurrentAccount() account: AuthContext,
    @Body() dto: UpdateInvoiceDto
  ) {
    return this.service.update(id, account.branchId!, dto)
  }

  @Patch(':id/status')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Transition invoice status' })
  transition(
    @Param('id') id: string,
    @CurrentAccount() account: AuthContext,
    @Body() dto: TransitionInvoiceDto
  ) {
    return this.service.transition(
      id,
      account.branchId!,
      account.organizationId!,
      dto.status,
      account.sub
    )
  }
}
