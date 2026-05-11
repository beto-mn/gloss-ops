import { randomUUID } from 'crypto'

import { Prisma, WorkOrderStatus, WorkOrderType } from '@glossops/database'

import type {
  WorkOrderRepositoryInterface,
  CreateWorkOrderData,
  UpdateWorkOrderData,
  WorkOrderQuery,
  WorkOrderPage,
  WorkOrderWithItems,
} from '@work-orders/interfaces'

export class InMemoryWorkOrderRepository implements WorkOrderRepositoryInterface {
  private store = new Map<string, Prisma.WorkOrderModel>()
  private branches = new Map<string, string>() // branchId → organizationId
  private getItems: (
    workOrderId: string
  ) => Promise<Prisma.WorkOrderItemModel[]> = () => Promise.resolve([])

  seedBranches(branches: { id: string; organizationId: string }[]): void {
    for (const b of branches) this.branches.set(b.id, b.organizationId)
  }

  setItemsGetter(
    fn: (workOrderId: string) => Promise<Prisma.WorkOrderItemModel[]>
  ): void {
    this.getItems = fn
  }

  private orgIdFor(branchId: string): string {
    return this.branches.get(branchId) ?? branchId
  }

  private belongsToOrg(
    wo: Prisma.WorkOrderModel,
    organizationId: string
  ): boolean {
    return this.orgIdFor(wo.branchId) === organizationId
  }

  create(data: CreateWorkOrderData): Promise<Prisma.WorkOrderModel> {
    const wo: Prisma.WorkOrderModel = {
      id: randomUUID(),
      branchId: data.branchId,
      assetId: data.assetId,
      type: data.type ?? WorkOrderType.STANDARD,
      warrantyClaimId: data.warrantyClaimId ?? null,
      status: WorkOrderStatus.DRAFT,
      scheduledAt: data.scheduledAt ?? null,
      completedAt: null,
      totalAmount: new Prisma.Decimal(0),
      note: data.note ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.store.set(wo.id, wo)
    return Promise.resolve(wo)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<WorkOrderWithItems | null> {
    const wo = this.store.get(id)
    if (!wo || !this.belongsToOrg(wo, organizationId)) return null
    const items = await this.getItems(id)
    return { ...wo, items }
  }

  findAll(
    organizationId: string,
    query: WorkOrderQuery
  ): Promise<WorkOrderPage> {
    let items = Array.from(this.store.values()).filter(wo =>
      this.belongsToOrg(wo, organizationId)
    )

    if (query.status) items = items.filter(wo => wo.status === query.status)
    if (query.assetId) items = items.filter(wo => wo.assetId === query.assetId)

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const total = items.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const data = items.slice(
      (query.page - 1) * query.limit,
      query.page * query.limit
    )

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

  update(
    id: string,
    _organizationId: string,
    data: UpdateWorkOrderData
  ): Promise<Prisma.WorkOrderModel> {
    const wo = this.store.get(id)!
    const updated: Prisma.WorkOrderModel = {
      ...wo,
      ...(data.scheduledAt !== undefined && {
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.totalAmount !== undefined && {
        totalAmount: new Prisma.Decimal(data.totalAmount),
      }),
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  updateStatus(
    id: string,
    _organizationId: string,
    status: WorkOrderStatus,
    completedAt?: Date
  ): Promise<Prisma.WorkOrderModel> {
    const wo = this.store.get(id)!
    const updated: Prisma.WorkOrderModel = {
      ...wo,
      status,
      ...(completedAt && { completedAt }),
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, organizationId: string): Promise<void> {
    const wo = this.store.get(id)
    if (!wo || !this.belongsToOrg(wo, organizationId)) return Promise.resolve()
    this.store.delete(id)
    return Promise.resolve()
  }
}
