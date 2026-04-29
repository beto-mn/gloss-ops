import {
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

import type { BranchPage } from '@branches/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateBranchDto, UpdateBranchDto, ListBranchesDto } from './dto'
import { BranchesService } from './branches.service'

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new branch' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateBranchDto
  ): Promise<Prisma.BranchModel> {
    return this.branchesService.create(account.organizationId!, dto)
  }

  @Get()
  @ApiOperation({
    summary: 'List branches with optional status filter and pagination',
  })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListBranchesDto
  ): Promise<BranchPage> {
    return this.branchesService.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a branch by ID' })
  findOne(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string
  ): Promise<Prisma.BranchModel> {
    return this.branchesService.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a branch' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto
  ): Promise<Prisma.BranchModel> {
    return this.branchesService.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({
    summary:
      'Soft-delete a branch. Hard delete happens automatically 30 days later.',
  })
  remove(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string
  ): Promise<void> {
    return this.branchesService.remove(id, account.organizationId!)
  }
}
