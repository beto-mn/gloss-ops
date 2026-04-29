import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import type { AuthContext, TokenPair } from '@auth/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'
import type {
  OrganizationWithRole,
  MemberWithAccount,
} from '@organizations/interfaces'

import { AcceptInvitationDto, CreateInvitationDto, UpdateOrgDto } from './dto'
import { OrganizationService } from './organizations.service'
import { Public } from '../auth/decorators/public.decorator'
import { TokenService } from '../auth/token.service'

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly orgService: OrganizationService,
    private readonly tokenService: TokenService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all organizations the current account belongs to',
  })
  listMyOrganizations(
    @CurrentAccount() account: AuthContext
  ): Promise<OrganizationWithRole[]> {
    return this.orgService.listMyOrganizations(account.sub)
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current organization' })
  getMyOrganization(
    @CurrentAccount() account: AuthContext
  ): Promise<Prisma.OrganizationModel> {
    return this.orgService.getMyOrganization(account.organizationId!)
  }

  @Patch('me')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update the current organization name or logo' })
  updateOrganization(
    @CurrentAccount() account: AuthContext,
    @Body() dto: UpdateOrgDto
  ): Promise<Prisma.OrganizationModel> {
    return this.orgService.updateOrganization(account.organizationId!, dto)
  }

  @Delete('me')
  @HttpCode(204)
  @Roles(Role.OWNER)
  @ApiOperation({
    summary:
      'Delete the current organization. Pass ?permanent=true to hard delete.',
  })
  removeOrganization(
    @CurrentAccount() account: AuthContext,
    @Query('permanent') permanent?: string
  ): Promise<void> {
    return this.orgService.removeOrganization(
      account.organizationId!,
      permanent === 'true'
    )
  }

  @Get('me/members')
  @ApiOperation({ summary: 'List all members of the current organization' })
  listMembers(
    @CurrentAccount() account: AuthContext
  ): Promise<MemberWithAccount[]> {
    return this.orgService.listMembers(account.organizationId!)
  }

  @Post('invitations')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create an invitation link for a new member' })
  createInvitation(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateInvitationDto
  ): Promise<{ invitationUrl: string }> {
    return this.orgService.createInvitation(
      account.organizationId!,
      dto.email,
      dto.role,
      dto.branchId
    )
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept an invitation and join an organization' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto): Promise<TokenPair> {
    const account = await this.orgService.acceptInvitation(dto)
    return this.tokenService.issueTokens(account.id, account.email)
  }
}
