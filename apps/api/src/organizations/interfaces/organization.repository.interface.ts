import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

export type OrganizationWithRole = Prisma.OrganizationModel & { role: Role }

export type MemberWithAccount = Prisma.OrganizationMemberModel & {
  account: Pick<
    Prisma.AccountModel,
    'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
  >
}

export interface CreateOrgData {
  name: string
  slug: string
}

export interface UpdateOrgData {
  name?: string
  logoUrl?: string | null
}

export interface OrganizationRepositoryInterface {
  findById(id: string): Promise<Prisma.OrganizationModel | null>
  findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]>
  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel>
  createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }>
  listMembers(organizationId: string): Promise<MemberWithAccount[]>
  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null>
  countMembershipsByAccount(accountId: string): Promise<number>
  addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel>
}
