import type { PurchaseOrderItemRecord } from './purchase-order.repository.interface'

export interface PurchaseOrderItemRepositoryInterface {
  findAllByOrder(purchaseOrderId: string): Promise<PurchaseOrderItemRecord[]>
}
