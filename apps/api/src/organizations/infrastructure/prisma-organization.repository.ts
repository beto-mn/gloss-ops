import { ConflictException, Injectable } from '@nestjs/common'

import { Prisma, ResourceStatus, Role } from '@glossops/database'

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
    return this.prisma.organization.findFirst({
      where: { id, status: ResourceStatus.ACTIVE },
    })
  }

  async findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        accountId,
        branch: { organization: { status: ResourceStatus.ACTIVE } },
      },
      include: { branch: { include: { organization: true } } },
    })
    return members.map(m => ({ ...m.branch.organization, role: m.role }))
  }

  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel> {
    return this.prisma.organization.update({ where: { id }, data })
  }

  async softDelete(id: string): Promise<Prisma.OrganizationModel> {
    const result = await this.prisma.organization.updateMany({
      where: { id },
      data: { status: ResourceStatus.DELETED },
    })
    if (result.count === 0) throw new Error('organization not found')
    const record = await this.prisma.organization.findFirst({ where: { id } })
    return record!
  }

  async delete(id: string): Promise<void> {
    const result = await this.prisma.organization.deleteMany({ where: { id } })
    if (result.count === 0) throw new Error('organization not found')
  }

  async createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }> {
    try {
      const organization = await this.prisma.organization.create({
        data: { name: data.name, slug: data.slug },
      })

      const branch = await this.prisma.branch.create({
        data: { organizationId: organization.id, name: data.name },
      })

      const member = await this.prisma.organizationMember.create({
        data: { branchId: branch.id, accountId, role: Role.OWNER },
      })

      return { organization, member }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({ error: 'organization_name_taken' })
      }
      throw e
    }
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
    const orgIds = new Set(members.map(m => m.branch.organizationId))
    return orgIds.size
  }

  addMember(
    branchId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel> {
    return this.prisma.organizationMember.create({
      data: { branchId, accountId, role },
    })
  }

  findBranchById(
    branchId: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null> {
    return this.prisma.branch.findFirst({
      where: { id: branchId, organizationId },
    })
  }
}
