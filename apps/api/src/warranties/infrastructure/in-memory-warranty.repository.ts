import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'

import type {
  WarrantyRepositoryInterface,
  ItemForGeneration,
  CreateWarrantyData,
  WarrantyWithAsset,
  WarrantyRecord,
} from '@warranties/interfaces'

interface ItemContext {
  workOrderId: string
  assetId: string
  branchId: string
  organizationId: string
}

@Injectable()
export class InMemoryWarrantyRepository implements WarrantyRepositoryInterface {
  readonly store = new Map<string, WarrantyRecord>()
  private readonly itemContexts = new Map<string, ItemContext>()
  private readonly itemsForGeneration = new Map<string, ItemForGeneration[]>()

  seedItemContext(workOrderItemId: string, ctx: ItemContext): void {
    this.itemContexts.set(workOrderItemId, ctx)
  }

  seedItemsForGeneration(
    workOrderId: string,
    items: ItemForGeneration[]
  ): void {
    this.itemsForGeneration.set(workOrderId, items)
  }

  createMany(data: CreateWarrantyData[]): Promise<WarrantyRecord[]> {
    return Promise.resolve(
      data.map(d => {
        const ctx = this.itemContexts.get(d.workOrderItemId)
        const record: WarrantyRecord = {
          id: randomUUID(),
          workOrderItemId: d.workOrderItemId,
          serviceId: d.serviceId,
          branchId: ctx?.branchId ?? '',
          description: d.description,
          term: d.term,
          validFrom: d.validFrom,
          validUntil: d.validUntil,
          isVoid: false,
          voidReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        this.store.set(record.id, record)
        return record
      })
    )
  }

  findItemsForGeneration(workOrderId: string): Promise<ItemForGeneration[]> {
    return Promise.resolve(this.itemsForGeneration.get(workOrderId) ?? [])
  }

  findById(id: string, organizationId: string): Promise<WarrantyRecord | null> {
    const record = this.store.get(id)
    if (!record) return Promise.resolve(null)
    const ctx = this.itemContexts.get(record.workOrderItemId)
    if (!ctx || ctx.organizationId !== organizationId)
      return Promise.resolve(null)
    return Promise.resolve(record)
  }

  findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return Promise.resolve(
      Array.from(this.store.values()).filter(r => {
        const ctx = this.itemContexts.get(r.workOrderItemId)
        return (
          ctx &&
          ctx.workOrderId === workOrderId &&
          ctx.organizationId === organizationId
        )
      })
    )
  }

  findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return Promise.resolve(
      Array.from(this.store.values()).filter(r => {
        const ctx = this.itemContexts.get(r.workOrderItemId)
        return (
          ctx &&
          ctx.assetId === assetId &&
          ctx.organizationId === organizationId
        )
      })
    )
  }

  findForClaimValidation(
    warrantyId: string,
    organizationId: string
  ): Promise<WarrantyWithAsset | null> {
    const record = this.store.get(warrantyId)
    if (!record) return Promise.resolve(null)
    const ctx = this.itemContexts.get(record.workOrderItemId)
    if (!ctx || ctx.organizationId !== organizationId)
      return Promise.resolve(null)
    return Promise.resolve({
      id: record.id,
      isVoid: record.isVoid,
      validUntil: record.validUntil,
      assetId: ctx.assetId,
    })
  }

  void(id: string, reason: string): Promise<WarrantyRecord> {
    const record = this.store.get(id)!
    const updated: WarrantyRecord = {
      ...record,
      isVoid: true,
      voidReason: reason,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }
}
