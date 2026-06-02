import type { AssignmentRole } from '@glossops/database'

export interface WorkOrderAssignmentRecord {
  id: string
  workOrderId: string
  memberId: string
  accountId: string
  role: AssignmentRole
  assignedAt: Date
  account: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface CreateWorkOrderAssignmentData {
  workOrderId: string
  memberId: string
  role: AssignmentRole
}

export interface WorkOrderAssignmentRepositoryInterface {
  create(
    data: CreateWorkOrderAssignmentData
  ): Promise<WorkOrderAssignmentRecord>
  findAllByWorkOrder(workOrderId: string): Promise<WorkOrderAssignmentRecord[]>
  findById(id: string): Promise<WorkOrderAssignmentRecord | null>
  existsByWorkOrderAndMember(
    workOrderId: string,
    memberId: string
  ): Promise<boolean>
  existsMemberInOrg(memberId: string, organizationId: string): Promise<boolean>
  delete(id: string): Promise<void>
}
