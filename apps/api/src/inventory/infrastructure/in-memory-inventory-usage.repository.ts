import { randomUUID } from 'crypto'

import { Prisma } from '@glossops/database'

import type {
  InventoryUsageRepositoryInterface,
  CommitUsagesResult,
  CreateInventoryUsageData,
  InventoryRecord,
} from '@inventory/interfaces'

export class InMemoryInventoryUsageRepository implements InventoryUsageRepositoryInterface {
  private store = new Map<string, Prisma.InventoryUsageModel>()
  private getInventoryRecord: (id: string) => Promise<InventoryRecord | null> =
    () => Promise.resolve(null)
  private decrementItemStock: (
    id: string,
    qty: Prisma.Decimal
  ) => Promise<Prisma.InventoryItemModel> = () => {
    throw new Error('setItemDecrementer not called')
  }
  private decrementRollLength: (
    id: string,
    qty: Prisma.Decimal
  ) => Promise<Prisma.MaterialRollModel> = () => {
    throw new Error('setRollDecrementer not called')
  }

  setInventoryGetter(
    fn: (id: string) => Promise<InventoryRecord | null>
  ): void {
    this.getInventoryRecord = fn
  }

  setItemDecrementer(
    fn: (id: string, qty: Prisma.Decimal) => Promise<Prisma.InventoryItemModel>
  ): void {
    this.decrementItemStock = fn
  }

  setRollDecrementer(
    fn: (id: string, qty: Prisma.Decimal) => Promise<Prisma.MaterialRollModel>
  ): void {
    this.decrementRollLength = fn
  }

  create(data: CreateInventoryUsageData): Promise<Prisma.InventoryUsageModel> {
    const usage: Prisma.InventoryUsageModel = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      inventoryId: data.inventoryId,
      quantityUsed: new Prisma.Decimal(data.quantityUsed),
      costAtUsage: new Prisma.Decimal(data.costAtUsage),
      createdAt: new Date(),
    }
    this.store.set(usage.id, usage)
    return Promise.resolve(usage)
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel | null> {
    const usage = this.store.get(id)
    if (!usage || usage.workOrderId !== workOrderId)
      return Promise.resolve(null)
    return Promise.resolve(usage)
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return Promise.resolve(
      [...this.store.values()].filter(u => u.workOrderId === workOrderId)
    )
  }

  findAllByInventory(
    inventoryId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return Promise.resolve(
      [...this.store.values()].filter(u => u.inventoryId === inventoryId)
    )
  }

  update(
    id: string,
    workOrderId: string,
    quantityUsed: Prisma.Decimal
  ): Promise<Prisma.InventoryUsageModel> {
    const usage = this.store.get(id)!
    const updated = { ...usage, quantityUsed }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  deleteByWorkOrder(workOrderId: string): Promise<void> {
    for (const [id, u] of [...this.store.entries()]) {
      if (u.workOrderId === workOrderId) this.store.delete(id)
    }
    return Promise.resolve()
  }

  async commitAll(workOrderId: string): Promise<CommitUsagesResult> {
    const usages = [...this.store.values()].filter(
      u => u.workOrderId === workOrderId
    )
    const warnings: string[] = []

    for (const usage of usages) {
      const inv = await this.getInventoryRecord(usage.inventoryId)
      if (!inv) continue

      if (inv.inventoryItem) {
        const item = await this.decrementItemStock(
          usage.inventoryId,
          usage.quantityUsed
        )
        if (Number(item.stock) < 0) {
          warnings.push(
            `${inv.name}: stock insuficiente (${Number(item.stock)} ${inv.inventoryItem.unit})`
          )
        } else if (
          inv.inventoryItem.lowStockAlert !== null &&
          Number(item.stock) <= Number(inv.inventoryItem.lowStockAlert)
        ) {
          warnings.push(
            `${inv.name}: stock bajo (${Number(item.stock)} ${inv.inventoryItem.unit})`
          )
        }
      } else if (inv.materialRoll) {
        const roll = await this.decrementRollLength(
          usage.inventoryId,
          usage.quantityUsed
        )
        if (Number(roll.remainingLength) < 0) {
          warnings.push(
            `${inv.name}: longitud insuficiente (${Number(roll.remainingLength)}m)`
          )
        }
      }
    }

    return { warnings }
  }
}
