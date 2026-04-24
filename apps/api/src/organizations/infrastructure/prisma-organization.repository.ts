import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  OrganizationRepositoryInterface,
  OrganizationWithRole,
  MemberWithAccount,
  CreateOrgData,
  UpdateOrgData,
} from '@organizations/interfaces'

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Prisma.OrganizationModel | null> {
    return this.prisma.organization.findUnique({ where: { id } })
  }

  async findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { accountId },
      include: { branch: { include: { organization: true } } },
    })
    return members.map((m) => ({ ...m.branch.organization, role: m.role }))
  }

  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel> {
    return this.prisma.organization.update({ where: { id }, data })
  }

  async createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }> {
    const organization = await this.prisma.organization.create({
      data: { name: data.name, slug: data.slug },
    })

    const branch = await this.prisma.branch.create({
      data: { organizationId: organization.id, name: data.name, isMain: true },
    })

    const member = await this.prisma.organizationMember.create({
      data: { branchId: branch.id, accountId, role: Role.OWNER },
    })

    return { organization, member }
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    return this.prisma.organizationMember.findMany({
      where: { branch: { organizationId } },
      include: {
        account: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    }) as Promise<MemberWithAccount[]>
  }

  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null> {
    return this.prisma.organizationMember.findFirst({
      where: { accountId, branch: { organizationId } },
    })
  }

  async countMembershipsByAccount(accountId: string): Promise<number> {
    const members = await this.prisma.organizationMember.findMany({
      where: { accountId },
      include: { branch: { select: { organizationId: true } } },
    })
    const orgIds = new Set(members.map((m) => m.branch.organizationId))
    return orgIds.size
  }

  async addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel> {
    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isMain: true },
    })
    return this.prisma.organizationMember.create({
      data: { branchId: branch!.id, accountId, role },
    })
  }
}
