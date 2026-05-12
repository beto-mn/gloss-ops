import type { Prisma } from '@glossops/database'

export interface ServiceInventoryDefaults {
  inventoryId: string
  defaultQuantity: Prisma.Decimal
}

export interface ServiceDefaultsRepositoryInterface {
  getInventoryDefaults(
    serviceId: string
  ): Promise<ServiceInventoryDefaults | null>
}
