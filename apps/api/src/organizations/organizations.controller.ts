import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common'

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

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly orgService: OrganizationService,
    private readonly tokenService: TokenService
  ) {}

  @Get()
  listMyOrganizations(
    @CurrentAccount() account: AuthContext
  ): Promise<OrganizationWithRole[]> {
    return this.orgService.listMyOrganizations(account.sub)
  }

  @Get('me')
  getMyOrganization(
    @CurrentAccount() account: AuthContext
  ): Promise<Prisma.OrganizationModel> {
    return this.orgService.getMyOrganization(account.organizationId!)
  }

  @Patch('me')
  @Roles(Role.OWNER, Role.MANAGER)
  updateOrganization(
    @CurrentAccount() account: AuthContext,
    @Body() dto: UpdateOrgDto
  ): Promise<Prisma.OrganizationModel> {
    return this.orgService.updateOrganization(account.organizationId!, dto)
  }

  @Get('me/members')
  listMembers(
    @CurrentAccount() account: AuthContext
  ): Promise<MemberWithAccount[]> {
    return this.orgService.listMembers(account.organizationId!)
  }

  @Post('invitations')
  @Roles(Role.OWNER, Role.MANAGER)
  createInvitation(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateInvitationDto
  ): Promise<{ invitationUrl: string }> {
    return this.orgService.createInvitation(
      account.organizationId!,
      dto.email,
      dto.role
    )
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(200)
  async acceptInvitation(@Body() dto: AcceptInvitationDto): Promise<TokenPair> {
    const account = await this.orgService.acceptInvitation(dto)
    return this.tokenService.issueTokens(account.id, account.email)
  }
}
