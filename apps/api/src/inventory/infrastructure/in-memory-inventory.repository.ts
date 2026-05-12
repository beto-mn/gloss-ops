import { InventoryType } from '@glossops/database'

import type {
  InventoryRepositoryInterface,
  InventoryRecord,
  InventoryPage,
  InventoryQuery,
} from '@inventory/interfaces'

export class InMemoryInventoryRepository implements InventoryRepositoryInterface {
  readonly store = new Map<string, InventoryRecord>()
  private hasActiveUsagesFn: (id: string) => Promise<boolean> = () =>
    Promise.resolve(false)

  setActiveUsagesChecker(fn: (id: string) => Promise<boolean>): void {
    this.hasActiveUsagesFn = fn
  }

  findById(id: string, branchId: string): Promise<InventoryRecord | null> {
    const record = this.store.get(id)
    if (!record || record.branchId !== branchId) return Promise.resolve(null)
    return Promise.resolve(record)
  }

  findByIdDirect(id: string): Promise<InventoryRecord | null> {
    return Promise.resolve(this.store.get(id) ?? null)
  }

  findAll(branchId: string, query: InventoryQuery): Promise<InventoryPage> {
    let data = [...this.store.values()].filter(r => r.branchId === branchId)

    // lowStock only applies to ITEMs; type filter is ignored when lowStock=true
    if (query.lowStock) {
      data = data.filter(r => {
        if (r.type !== InventoryType.ITEM || !r.inventoryItem) return false
        const { stock, lowStockAlert } = r.inventoryItem
        return lowStockAlert !== null && Number(stock) <= Number(lowStockAlert)
      })
    } else if (query.type) {
      data = data.filter(r => r.type === query.type)
    }
    if (query.supplierId)
      data = data.filter(r => r.supplierId === query.supplierId)
    if (query.brandId) data = data.filter(r => r.brandId === query.brandId)

    data.sort((a, b) => a.name.localeCompare(b.name))

    const total = data.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const page = query.page
    const sliced = data.slice((page - 1) * query.limit, page * query.limit)

    return Promise.resolve({
      data: sliced,
      meta: {
        total,
        totalPages,
        page,
        limit: query.limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  }

  hasActiveUsages(id: string): Promise<boolean> {
    return this.hasActiveUsagesFn(id)
  }
}
