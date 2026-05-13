import type { PurchaseOrderItemRepositoryInterface } from '@purchase-orders/interfaces'
import type { PurchaseOrderWithItems } from '@purchase-orders/interfaces'
import type { PurchaseOrderItemRecord } from '@purchase-orders/interfaces'

export class InMemoryPurchaseOrderItemRepository implements PurchaseOrderItemRepositoryInterface {
  constructor(private readonly store: Map<string, PurchaseOrderWithItems>) {}

  findAllByOrder(purchaseOrderId: string): Promise<PurchaseOrderItemRecord[]> {
    const po = [...this.store.values()].find(p => p.id === purchaseOrderId)
    return Promise.resolve(po?.items ?? [])
  }
}
