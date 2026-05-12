import { Injectable } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  ServiceDefaultsRepositoryInterface,
  ServiceInventoryDefaults,
} from '@inventory/interfaces'

@Injectable()
export class PrismaServiceDefaultsRepository implements ServiceDefaultsRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async getInventoryDefaults(
    serviceId: string
  ): Promise<ServiceInventoryDefaults | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { defaultInventoryId: true, defaultQuantity: true },
    })
    if (!service?.defaultInventoryId) return null
    return {
      inventoryId: service.defaultInventoryId,
      defaultQuantity: service.defaultQuantity ?? new Prisma.Decimal(1),
    }
  }
}
