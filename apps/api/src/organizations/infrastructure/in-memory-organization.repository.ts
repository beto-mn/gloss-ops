import { randomUUID } from 'crypto'

import { ResourceStatus, Role } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type {
  CreateOrgData,
  MemberWithAccount,
  OrganizationRepositoryInterface,
  OrganizationWithRole,
  UpdateOrgData,
} from '@organizations/interfaces'

export class InMemoryOrganizationRepository implements OrganizationRepositoryInterface {
  private organizations = new Map<string, Prisma.OrganizationModel>()
  private branches = new Map<string, Prisma.BranchModel>()
  private members = new Map<string, Prisma.OrganizationMemberModel>()
  private accounts = new Map<
    string,
    Pick<
      Prisma.AccountModel,
      'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
    >
  >()

  seedAccounts(
    accounts: Pick<
      Prisma.AccountModel,
      'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
    >[]
  ): void {
    accounts.forEach(a => this.accounts.set(a.id, a))
  }

  findById(id: string): Promise<Prisma.OrganizationModel | null> {
    const org = this.organizations.get(id)
    if (!org || org.status !== ResourceStatus.ACTIVE)
      return Promise.resolve(null)
    return Promise.resolve(org)
  }

  findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]> {
    const result: OrganizationWithRole[] = []
    for (const member of this.members.values()) {
      if (member.accountId !== accountId) continue
      const branch = this.branches.get(member.branchId)
      if (!branch) continue
      const org = this.organizations.get(branch.organizationId)
      if (!org || org.status !== ResourceStatus.ACTIVE) continue
      result.push({ ...org, role: member.role })
    }
    return Promise.resolve(result)
  }

  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel> {
    const org = this.organizations.get(id)
    if (!org) return Promise.reject(new Error('organization not found'))
    const updated = { ...org, ...data, updatedAt: new Date() }
    this.organizations.set(id, updated)
    return Promise.resolve(updated)
  }

  softDelete(id: string): Promise<Prisma.OrganizationModel> {
    const org = this.organizations.get(id)
    if (!org) return Promise.reject(new Error('organization not found'))
    const updated = {
      ...org,
      status: ResourceStatus.DELETED,
      updatedAt: new Date(),
    }
    this.organizations.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string): Promise<void> {
    if (!this.organizations.has(id))
      return Promise.reject(new Error('organization not found'))
    this.organizations.delete(id)
    return Promise.resolve()
  }

  createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }> {
    const now = new Date()
    const orgId = randomUUID()
    const branchId = randomUUID()

    const organization: Prisma.OrganizationModel = {
      id: orgId,
      name: data.name,
      slug: data.slug,
      logoUrl: null,
      status: ResourceStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    }

    const branch: Prisma.BranchModel = {
      id: branchId,
      organizationId: orgId,
      name: data.name,
      address: null,
      phone: null,
      email: null,
      createdAt: now,
      updatedAt: now,
    }

    const member: Prisma.OrganizationMemberModel = {
      id: randomUUID(),
      branchId,
      accountId,
      role: Role.OWNER,
      joinedAt: now,
    }

    this.organizations.set(orgId, organization)
    this.branches.set(branchId, branch)
    this.members.set(member.id, member)

    return Promise.resolve({ organization, member })
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    const orgBranchIds = new Set(
      [...this.branches.values()]
        .filter(b => b.organizationId === organizationId)
        .map(b => b.id)
    )

    const result: MemberWithAccount[] = []
    for (const member of this.members.values()) {
      if (!orgBranchIds.has(member.branchId)) continue
      const account = this.accounts.get(member.accountId)
      if (!account) continue
      result.push({ ...member, account })
    }
    return Promise.resolve(result)
  }

  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null> {
    const orgBranchIds = new Set(
      [...this.branches.values()]
        .filter(b => b.organizationId === organizationId)
        .map(b => b.id)
    )

    for (const member of this.members.values()) {
      if (member.accountId === accountId && orgBranchIds.has(member.branchId)) {
        return Promise.resolve(member)
      }
    }
    return Promise.resolve(null)
  }

  countMembershipsByAccount(accountId: string): Promise<number> {
    const orgIds = new Set<string>()
    for (const member of this.members.values()) {
      if (member.accountId !== accountId) continue
      const branch = this.branches.get(member.branchId)
      if (branch) orgIds.add(branch.organizationId)
    }
    return Promise.resolve(orgIds.size)
  }

  addMember(
    branchId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel> {
    if (!this.branches.has(branchId))
      return Promise.reject(new Error('branch not found'))

    const member: Prisma.OrganizationMemberModel = {
      id: randomUUID(),
      branchId,
      accountId,
      role,
      joinedAt: new Date(),
    }
    this.members.set(member.id, member)
    return Promise.resolve(member)
  }

  findBranchById(
    branchId: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null> {
    const branch = this.branches.get(branchId)
    if (!branch || branch.organizationId !== organizationId)
      return Promise.resolve(null)
    return Promise.resolve(branch)
  }
}
