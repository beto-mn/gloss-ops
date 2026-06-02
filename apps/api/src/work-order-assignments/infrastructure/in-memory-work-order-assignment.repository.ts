import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'

import type {
  WorkOrderAssignmentRepositoryInterface,
  CreateWorkOrderAssignmentData,
  WorkOrderAssignmentRecord,
} from '@work-order-assignments/interfaces'

@Injectable()
export class InMemoryWorkOrderAssignmentRepository implements WorkOrderAssignmentRepositoryInterface {
  readonly store = new Map<string, WorkOrderAssignmentRecord>()
  private readonly members = new Map<string, string>() // memberId → organizationId

  seedMember(memberId: string, organizationId: string): void {
    this.members.set(memberId, organizationId)
  }

  create(
    data: CreateWorkOrderAssignmentData
  ): Promise<WorkOrderAssignmentRecord> {
    const record: WorkOrderAssignmentRecord = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      memberId: data.memberId,
      accountId: data.memberId,
      role: data.role,
      assignedAt: new Date(),
      account: { id: data.memberId, firstName: '', lastName: '', email: '' },
    }
    this.store.set(record.id, record)
    return Promise.resolve(record)
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<WorkOrderAssignmentRecord[]> {
    return Promise.resolve(
      Array.from(this.store.values()).filter(r => r.workOrderId === workOrderId)
    )
  }

  findById(id: string): Promise<WorkOrderAssignmentRecord | null> {
    return Promise.resolve(this.store.get(id) ?? null)
  }

  existsByWorkOrderAndMember(
    workOrderId: string,
    memberId: string
  ): Promise<boolean> {
    return Promise.resolve(
      Array.from(this.store.values()).some(
        r => r.workOrderId === workOrderId && r.memberId === memberId
      )
    )
  }

  existsMemberInOrg(
    memberId: string,
    organizationId: string
  ): Promise<boolean> {
    return Promise.resolve(this.members.get(memberId) === organizationId)
  }

  delete(id: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }
}
