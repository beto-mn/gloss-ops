import { randomUUID } from 'crypto'
import * as bcrypt from 'bcrypt'
import {
  UnprocessableEntityException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import type { AccountRepositoryInterface } from '@auth/interfaces'
import { envs } from '@config'
import type {
  OrganizationRepositoryInterface,
  InvitationStoreInterface,
  OrganizationWithRole,
  MemberWithAccount,
  UpdateOrgData,
} from '@organizations/interfaces'

import { ACCOUNT_REPOSITORY } from '../auth/auth.tokens'
import {
  ORGANIZATION_REPOSITORY,
  INVITATION_STORE,
} from './organizations.tokens'

const ORG_MEMBERSHIP_CAP = 5

export interface AcceptInvitationDto {
  token: string
  firstName?: string
  lastName?: string
  password?: string
}

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepositoryInterface,
    @Inject(INVITATION_STORE)
    private readonly invitationStore: InvitationStoreInterface,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryInterface
  ) {}

  async getMyOrganization(
    organizationId: string
  ): Promise<Prisma.OrganizationModel> {
    const org = await this.organizations.findById(organizationId)
    if (!org) throw new NotFoundException({ error: 'organization_not_found' })
    return org
  }

  listMyOrganizations(accountId: string): Promise<OrganizationWithRole[]> {
    return this.organizations.findAllByAccountId(accountId)
  }

  updateOrganization(
    organizationId: string,
    data: UpdateOrgData
  ): Promise<Prisma.OrganizationModel> {
    return this.organizations.update(organizationId, data)
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    return this.organizations.listMembers(organizationId)
  }

  async createInvitation(
    organizationId: string,
    email: string,
    role: Role
  ): Promise<{ invitationUrl: string }> {
    const token = randomUUID()
    await this.invitationStore.save(
      token,
      { orgId: organizationId, email, role },
      envs.invitation.expiresInDays
    )
    const invitationUrl = `${envs.app.frontendUrl}/invitations/accept?token=${token}`
    return { invitationUrl }
  }

  async acceptInvitation(
    dto: AcceptInvitationDto
  ): Promise<Prisma.AccountModel> {
    const payload = await this.invitationStore.get(dto.token)
    if (!payload) throw new BadRequestException({ error: 'invalid_invitation' })

    const { orgId, email, role } = payload

    let account = await this.accounts.findByEmail(email)

    if (!account) {
      if (!dto.firstName || !dto.lastName || !dto.password) {
        throw new BadRequestException({ error: 'invalid_invitation' })
      }
      const passwordHash = await bcrypt.hash(dto.password, 12)
      account = await this.accounts.create({
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      })
    }

    const orgCount = await this.organizations.countMembershipsByAccount(
      account.id
    )
    if (orgCount >= ORG_MEMBERSHIP_CAP) {
      throw new UnprocessableEntityException({
        error: 'organization_limit_reached',
      })
    }

    const existingMember = await this.organizations.findMember(
      account.id,
      orgId
    )
    if (existingMember)
      throw new ConflictException({ error: 'already_a_member' })

    await this.organizations.addMember(orgId, account.id, role)
    await this.invitationStore.delete(dto.token)

    return account
  }
}
