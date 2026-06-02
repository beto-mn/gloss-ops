import { Injectable } from '@nestjs/common'

import { PrismaService } from '@prisma'
import type {
  WorkOrderAssignmentRepositoryInterface,
  CreateWorkOrderAssignmentData,
  WorkOrderAssignmentRecord,
} from '@work-order-assignments/interfaces'

const accountSelect = {
  select: { id: true, firstName: true, lastName: true, email: true },
} as const

const memberInclude = {
  include: { account: accountSelect },
} as const

@Injectable()
export class PrismaWorkOrderAssignmentRepository implements WorkOrderAssignmentRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateWorkOrderAssignmentData
  ): Promise<WorkOrderAssignmentRecord> {
    const row = await this.prisma.workOrderAssignment.create({
      data: {
        workOrderId: data.workOrderId,
        memberId: data.memberId,
        role: data.role,
      },
      include: { member: memberInclude },
    })
    return {
      id: row.id,
      workOrderId: row.workOrderId,
      memberId: row.memberId,
      accountId: row.member.account.id,
      role: row.role,
      assignedAt: row.assignedAt,
      account: {
        id: row.member.account.id,
        firstName: row.member.account.firstName,
        lastName: row.member.account.lastName,
        email: row.member.account.email,
      },
    }
  }

  async findAllByWorkOrder(
    workOrderId: string
  ): Promise<WorkOrderAssignmentRecord[]> {
    const rows = await this.prisma.workOrderAssignment.findMany({
      where: { workOrderId },
      orderBy: { assignedAt: 'asc' },
      include: { member: memberInclude },
    })
    return rows.map(r => ({
      id: r.id,
      workOrderId: r.workOrderId,
      memberId: r.memberId,
      accountId: r.member.account.id,
      role: r.role,
      assignedAt: r.assignedAt,
      account: {
        id: r.member.account.id,
        firstName: r.member.account.firstName,
        lastName: r.member.account.lastName,
        email: r.member.account.email,
      },
    }))
  }

  async findById(id: string): Promise<WorkOrderAssignmentRecord | null> {
    const row = await this.prisma.workOrderAssignment.findUnique({
      where: { id },
      include: { member: memberInclude },
    })
    if (!row) return null
    return {
      id: row.id,
      workOrderId: row.workOrderId,
      memberId: row.memberId,
      accountId: row.member.account.id,
      role: row.role,
      assignedAt: row.assignedAt,
      account: {
        id: row.member.account.id,
        firstName: row.member.account.firstName,
        lastName: row.member.account.lastName,
        email: row.member.account.email,
      },
    }
  }

  async existsByWorkOrderAndMember(
    workOrderId: string,
    memberId: string
  ): Promise<boolean> {
    const count = await this.prisma.workOrderAssignment.count({
      where: { workOrderId, memberId },
    })
    return count > 0
  }

  async existsMemberInOrg(
    memberId: string,
    organizationId: string
  ): Promise<boolean> {
    const count = await this.prisma.organizationMember.count({
      where: { id: memberId, branch: { organizationId } },
    })
    return count > 0
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workOrderAssignment.delete({ where: { id } })
  }
}
