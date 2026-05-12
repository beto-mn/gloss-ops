import { Prisma } from '@glossops/database'

import type {
  ServiceDefaultsRepositoryInterface,
  ServiceInventoryDefaults,
} from '@inventory/interfaces'

export class InMemoryServiceDefaultsRepository implements ServiceDefaultsRepositoryInterface {
  private store = new Map<string, ServiceInventoryDefaults>()

  seed(serviceId: string, inventoryId: string, defaultQuantity: number): void {
    this.store.set(serviceId, {
      inventoryId,
      defaultQuantity: new Prisma.Decimal(defaultQuantity),
    })
  }

  getInventoryDefaults(
    serviceId: string
  ): Promise<ServiceInventoryDefaults | null> {
    return Promise.resolve(this.store.get(serviceId) ?? null)
  }
}
