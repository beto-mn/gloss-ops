import { randomUUID } from 'crypto'

import { ResourceStatus } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type {
  BranchRepositoryInterface,
  CreateBranchData,
  UpdateBranchData,
  BranchQuery,
  BranchPage,
} from '@branches/interfaces'

export class InMemoryBranchRepository implements BranchRepositoryInterface {
  private branches = new Map<string, Prisma.BranchModel>()

  // Member rows linked to a branch — wired up so hardDelete cascades.
  private members = new Map<string, { id: string; branchId: string }>()

  seedMember(member: { id: string; branchId: string }): void {
    this.members.set(member.id, member)
  }

  listMembers(): { id: string; branchId: string }[] {
    return [...this.members.values()]
  }

  create(
    organizationId: string,
    data: CreateBranchData
  ): Promise<Prisma.BranchModel> {
    const now = new Date()
    const branch: Prisma.BranchModel = {
      id: randomUUID(),
      organizationId,
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      status: ResourceStatus.ACTIVE,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.branches.set(branch.id, branch)
    return Promise.resolve(branch)
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null> {
    const branch = this.branches.get(id)
    if (
      !branch ||
      branch.organizationId !== organizationId ||
      branch.status !== ResourceStatus.ACTIVE
    ) {
      return Promise.resolve(null)
    }
    return Promise.resolve(branch)
  }

  findByName(
    name: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null> {
    for (const branch of this.branches.values()) {
      if (
        branch.organizationId === organizationId &&
        branch.name === name &&
        branch.status === ResourceStatus.ACTIVE
      ) {
        return Promise.resolve(branch)
      }
    }
    return Promise.resolve(null)
  }

  findAll(organizationId: string, query: BranchQuery): Promise<BranchPage> {
    let list = [...this.branches.values()].filter(
      b => b.organizationId === organizationId
    )

    if (query.status !== 'ALL') {
      list = list.filter(b => b.status === query.status)
    }

    if (query.search) {
      const term = query.search.toLowerCase()
      list = list.filter(b => b.name.toLowerCase().includes(term))
    }

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const total = list.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const offset = (query.page - 1) * query.limit
    const data = list.slice(offset, offset + query.limit)

    return Promise.resolve({
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    })
  }

  countActive(organizationId: string): Promise<number> {
    let count = 0
    for (const branch of this.branches.values()) {
      if (
        branch.organizationId === organizationId &&
        branch.status === ResourceStatus.ACTIVE
      ) {
        count += 1
      }
    }
    return Promise.resolve(count)
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateBranchData
  ): Promise<Prisma.BranchModel> {
    const branch = this.branches.get(id)
    if (!branch || branch.organizationId !== organizationId) {
      return Promise.reject(new Error('branch not found'))
    }
    const updated: Prisma.BranchModel = {
      ...branch,
      ...data,
      updatedAt: new Date(),
    }
    this.branches.set(id, updated)
    return Promise.resolve(updated)
  }

  softDelete(id: string, organizationId: string): Promise<Prisma.BranchModel> {
    const branch = this.branches.get(id)
    if (!branch || branch.organizationId !== organizationId) {
      return Promise.reject(new Error('branch not found'))
    }
    const now = new Date()
    const updated: Prisma.BranchModel = {
      ...branch,
      status: ResourceStatus.DELETED,
      deletedAt: now,
      updatedAt: now,
    }
    this.branches.set(id, updated)
    return Promise.resolve(updated)
  }

  findExpiredDeleted(olderThan: Date): Promise<Prisma.BranchModel[]> {
    const result: Prisma.BranchModel[] = []
    for (const branch of this.branches.values()) {
      if (
        branch.status === ResourceStatus.DELETED &&
        branch.deletedAt !== null &&
        branch.deletedAt < olderThan
      ) {
        result.push(branch)
      }
    }
    return Promise.resolve(result)
  }

  hardDelete(id: string): Promise<void> {
    if (!this.branches.has(id)) {
      return Promise.resolve()
    }
    this.branches.delete(id)
    // Cascade: remove the OrganizationMember rows anchored to this branch.
    for (const [memberId, member] of this.members.entries()) {
      if (member.branchId === id) this.members.delete(memberId)
    }
    return Promise.resolve()
  }
}
