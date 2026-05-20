import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ActivityAction,
  AssignmentRole,
  WorkOrderStatus,
} from '@glossops/database'

import type { WorkOrderAssignmentRecord } from '@work-order-assignments/interfaces'

import { CreateWorkOrderAssignmentDto } from './dto/create-work-order-assignment.dto'
import { WORK_ORDER_ASSIGNMENT_REPOSITORY } from './work-order-assignments.tokens'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import type { WorkOrderAssignmentRepositoryInterface } from './interfaces'
import { WorkOrdersService } from '../work-orders/work-orders.service'

@Injectable()
export class WorkOrderAssignmentsService {
  constructor(
    @Inject(WORK_ORDER_ASSIGNMENT_REPOSITORY)
    private readonly repo: WorkOrderAssignmentRepositoryInterface,
    private readonly workOrdersService: WorkOrdersService,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async create(
    workOrderId: string,
    dto: CreateWorkOrderAssignmentDto,
    accountId: string,
    organizationId: string
  ): Promise<WorkOrderAssignmentRecord> {
    const wo = await this.workOrdersService.findOne(workOrderId, organizationId)

    if (
      wo.status === WorkOrderStatus.COMPLETED ||
      wo.status === WorkOrderStatus.CANCELLED
    ) {
      throw new ConflictException({ error: 'work_order_not_assignable' })
    }

    const memberExists = await this.repo.existsMemberInOrg(
      dto.memberId,
      organizationId
    )
    if (!memberExists) {
      throw new NotFoundException({ error: 'member_not_found' })
    }

    const alreadyAssigned = await this.repo.existsByWorkOrderAndMember(
      workOrderId,
      dto.memberId
    )
    if (alreadyAssigned) {
      throw new ConflictException({ error: 'assignment_already_exists' })
    }

    const role = dto.role ?? AssignmentRole.ASSISTANT
    const record = await this.repo.create({
      workOrderId,
      memberId: dto.memberId,
      role,
    })

    await this.activityLogs.record({
      organizationId,
      branchId: wo.branchId,
      accountId,
      action: ActivityAction.ASSIGNED,
      entity: 'WorkOrder',
      entityId: workOrderId,
      metadata: { memberId: dto.memberId, role },
    })

    return record
  }

  async findAll(
    workOrderId: string,
    organizationId: string
  ): Promise<WorkOrderAssignmentRecord[]> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    return this.repo.findAllByWorkOrder(workOrderId)
  }

  async remove(
    workOrderId: string,
    id: string,
    organizationId: string
  ): Promise<void> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    const assignment = await this.repo.findById(id)
    if (!assignment || assignment.workOrderId !== workOrderId) {
      throw new NotFoundException({ error: 'assignment_not_found' })
    }
    await this.repo.delete(id)
  }
}
