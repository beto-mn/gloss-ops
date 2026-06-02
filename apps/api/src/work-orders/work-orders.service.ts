import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import {
  ActivityAction,
  WorkOrderStatus,
  WorkOrderType,
  type Prisma,
} from '@glossops/database'

import type {
  WorkOrderDetail,
  WorkOrderItemRepositoryInterface,
  WorkOrderPage,
  WorkOrderRepositoryInterface,
} from '@work-orders/interfaces'

import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WarrantyService } from '../warranties/warranties.service'
import { InventoryService } from '../inventory/inventory.service'
import type {
  CreateWorkOrderDto,
  CreateWorkOrderItemDto,
  ListWorkOrdersDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderItemDto,
} from './dto'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'

const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.DRAFT]: [
    WorkOrderStatus.CONFIRMED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.CONFIRMED]: [
    WorkOrderStatus.DRAFT,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.COMPLETED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.COMPLETED]: [],
  [WorkOrderStatus.CANCELLED]: [],
}

@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY)
    private readonly workOrders: WorkOrderRepositoryInterface,
    @Inject(WORK_ORDER_ITEM_REPOSITORY)
    private readonly workOrderItems: WorkOrderItemRepositoryInterface,
    private readonly inventoryService: InventoryService,
    private readonly warrantyService: WarrantyService,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async create(
    branchId: string,
    organizationId: string,
    dto: CreateWorkOrderDto,
    accountId: string
  ): Promise<Prisma.WorkOrderModel> {
    if (dto.type === WorkOrderType.WARRANTY_CLAIM && dto.warrantyClaimId) {
      await this.warrantyService.validateClaim(
        dto.warrantyClaimId,
        dto.assetId,
        organizationId
      )
    }
    const wo = await this.workOrders.create({
      branchId,
      assetId: dto.assetId,
      type: dto.type ?? WorkOrderType.STANDARD,
      warrantyClaimId: dto.warrantyClaimId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      note: dto.note,
    })
    if (dto.items?.length) {
      for (const item of dto.items) {
        await this.workOrderItems.create({
          workOrderId: wo.id,
          serviceId: item.serviceId,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice,
          discount: 0,
          isBillable: true,
          description: item.note,
        })
      }
      await this.syncTotal(wo.id, organizationId)
    }
    await this.activityLogs.record({
      organizationId,
      branchId,
      accountId,
      action: ActivityAction.CREATED,
      entity: 'WorkOrder',
      entityId: wo.id,
    })
    return wo
  }

  findAll(
    organizationId: string,
    dto: ListWorkOrdersDto
  ): Promise<WorkOrderPage> {
    return this.workOrders.findAll(organizationId, {
      status: dto.status,
      assetId: dto.assetId,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, organizationId: string): Promise<WorkOrderDetail> {
    const wo = await this.workOrders.findById(id, organizationId)
    if (!wo) throw new NotFoundException({ error: 'work_order_not_found' })
    return {
      ...wo,
      customerId: wo.asset.customer.id,
      customer: wo.asset.customer,
      total: Number(wo.totalAmount),
      asset: {
        id: wo.asset.id,
        assetType: wo.asset.assetType,
        customAssetType: wo.asset.customAssetType,
        model: wo.asset.model,
        identifier: wo.asset.identifier,
        brandName: wo.asset.brand?.name ?? null,
      },
      items: wo.items.map(item => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        note: item.description,
      })),
    }
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateWorkOrderDto
  ): Promise<Prisma.WorkOrderModel> {
    await this.findOne(id, organizationId)
    return this.workOrders.update(id, organizationId, {
      scheduledAt:
        dto.scheduledAt === null
          ? null
          : dto.scheduledAt
            ? new Date(dto.scheduledAt)
            : undefined,
      note: dto.note,
    })
  }

  async transition(
    id: string,
    organizationId: string,
    newStatus: WorkOrderStatus,
    accountId: string
  ): Promise<Prisma.WorkOrderModel> {
    const wo = await this.findOne(id, organizationId)
    const prevStatus = wo.status
    if (!VALID_TRANSITIONS[wo.status].includes(newStatus)) {
      throw new ConflictException({ error: 'invalid_status_transition' })
    }
    const completedAt =
      newStatus === WorkOrderStatus.COMPLETED ? new Date() : undefined
    const updated = await this.workOrders.updateStatus(
      id,
      organizationId,
      newStatus,
      completedAt
    )
    if (newStatus === WorkOrderStatus.COMPLETED) {
      await this.inventoryService.commitUsages(id)
      await this.warrantyService.generateForWorkOrder(
        id,
        organizationId,
        completedAt!
      )
    } else if (newStatus === WorkOrderStatus.CANCELLED) {
      await this.inventoryService.deleteUsagesByWorkOrder(id)
    }
    await this.activityLogs.record({
      organizationId,
      branchId: wo.branchId,
      accountId,
      action: ActivityAction.STATUS_CHANGED,
      entity: 'WorkOrder',
      entityId: id,
      metadata: { from: prevStatus, to: newStatus },
    })
    return updated
  }

  async remove(
    id: string,
    organizationId: string,
    accountId: string
  ): Promise<void> {
    const wo = await this.findOne(id, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_deletable' })
    }
    await this.workOrders.delete(id, organizationId)
    await this.activityLogs.record({
      organizationId,
      branchId: wo.branchId,
      accountId,
      action: ActivityAction.DELETED,
      entity: 'WorkOrder',
      entityId: id,
    })
  }

  async addItem(
    workOrderId: string,
    organizationId: string,
    dto: CreateWorkOrderItemDto
  ): Promise<Prisma.WorkOrderItemModel> {
    const wo = await this.findOne(workOrderId, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_editable' })
    }
    const item = await this.workOrderItems.create({
      workOrderId,
      serviceId: dto.serviceId,
      description: dto.description,
      quantity: dto.quantity ?? 1,
      unitPrice: dto.unitPrice,
      discount: dto.discount ?? 0,
      isBillable: dto.isBillable ?? true,
    })
    await this.syncTotal(workOrderId, organizationId)
    await this.inventoryService.maybeCreateUsage(workOrderId, dto.serviceId)
    return item
  }

  async getItems(
    workOrderId: string,
    organizationId: string
  ): Promise<Prisma.WorkOrderItemModel[]> {
    await this.findOne(workOrderId, organizationId)
    return this.workOrderItems.findAllByWorkOrder(workOrderId)
  }

  async updateItem(
    workOrderId: string,
    itemId: string,
    organizationId: string,
    dto: UpdateWorkOrderItemDto
  ): Promise<Prisma.WorkOrderItemModel> {
    const wo = await this.findOne(workOrderId, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_editable' })
    }
    const existing = await this.workOrderItems.findById(itemId, workOrderId)
    if (!existing)
      throw new NotFoundException({ error: 'work_order_item_not_found' })

    const updated = await this.workOrderItems.update(itemId, workOrderId, {
      serviceId: dto.serviceId,
      description: dto.description,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discount: dto.discount,
      isBillable: dto.isBillable,
    })
    await this.syncTotal(workOrderId, organizationId)
    return updated
  }

  async removeItem(
    workOrderId: string,
    itemId: string,
    organizationId: string
  ): Promise<void> {
    const wo = await this.findOne(workOrderId, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_editable' })
    }
    const existing = await this.workOrderItems.findById(itemId, workOrderId)
    if (!existing)
      throw new NotFoundException({ error: 'work_order_item_not_found' })

    await this.workOrderItems.delete(itemId, workOrderId)
    await this.syncTotal(workOrderId, organizationId)
  }

  private async syncTotal(
    workOrderId: string,
    organizationId: string
  ): Promise<void> {
    const items = await this.workOrderItems.findAllByWorkOrder(workOrderId)
    const total = items.reduce((acc, i) => acc + Number(i.subtotal), 0)
    await this.workOrders.update(workOrderId, organizationId, {
      totalAmount: total,
    })
  }
}
