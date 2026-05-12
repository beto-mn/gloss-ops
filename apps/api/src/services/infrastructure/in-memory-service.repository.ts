import { randomUUID } from 'crypto'

import { ConflictException } from '@nestjs/common'
import { Prisma } from '@glossops/database'

import type {
  ServiceRepositoryInterface,
  CreateServiceData,
  UpdateServiceData,
  ServiceQuery,
  ServicePage,
} from '@services/interfaces'

export class InMemoryServiceRepository implements ServiceRepositoryInterface {
  private services = new Map<string, Prisma.ServiceModel>()
  private workOrderItems = new Map<string, { id: string; serviceId: string }>()
  private warranties = new Map<string, { id: string; serviceId: string }>()

  seedWorkOrderItems(items: { id: string; serviceId: string }[]) {
    for (const item of items) this.workOrderItems.set(item.id, item)
  }

  seedWarranties(items: { id: string; serviceId: string }[]) {
    for (const item of items) this.warranties.set(item.id, item)
  }

  private hasConflictingName(
    organizationId: string,
    name: string,
    excludeId?: string
  ): boolean {
    for (const svc of this.services.values()) {
      if (
        svc.organizationId === organizationId &&
        svc.name === name &&
        svc.id !== excludeId
      ) {
        return true
      }
    }
    return false
  }

  create(
    organizationId: string,
    data: CreateServiceData
  ): Promise<Prisma.ServiceModel> {
    if (this.hasConflictingName(organizationId, data.name)) {
      return Promise.reject(
        new ConflictException({ error: 'name_already_exists' })
      )
    }
    const now = new Date()
    const service: Prisma.ServiceModel = {
      id: randomUUID(),
      organizationId,
      name: data.name,
      description: data.description ?? null,
      basePrice: new Prisma.Decimal(data.basePrice ?? 0),
      isActive: true,
      claveProdServ: data.claveProdServ ?? null,
      claveUnidad: data.claveUnidad ?? null,
      warrantyDays: data.warrantyDays ?? null,
      warrantyDescription: data.warrantyDescription ?? null,
      warrantyTerm: data.warrantyTerm ?? null,
      defaultInventoryId: null,
      defaultQuantity: null,
      createdAt: now,
      updatedAt: now,
    }
    this.services.set(service.id, service)
    return Promise.resolve(service)
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel | null> {
    const service = this.services.get(id)
    if (!service || service.organizationId !== organizationId)
      return Promise.resolve(null)
    return Promise.resolve(service)
  }

  findAll(organizationId: string, query: ServiceQuery): Promise<ServicePage> {
    let list = [...this.services.values()].filter(
      s => s.organizationId === organizationId
    )

    if (!query.includeInactive) {
      list = list.filter(s => s.isActive)
    }

    if (query.search) {
      const term = query.search.toLowerCase()
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(term) ||
          s.description?.toLowerCase().includes(term)
      )
    }

    list.sort((a, b) => a.name.localeCompare(b.name))

    const total = list.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const offset = (query.page - 1) * query.limit
    const data = list.slice(offset, offset + query.limit)

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
    organizationId: string,
    data: UpdateServiceData
  ): Promise<Prisma.ServiceModel> {
    const service = this.services.get(id)
    if (!service || service.organizationId !== organizationId) {
      return Promise.reject(new Error('service not found'))
    }
    if (data.name !== undefined && data.name !== service.name) {
      if (this.hasConflictingName(organizationId, data.name, id)) {
        return Promise.reject(
          new ConflictException({ error: 'name_already_exists' })
        )
      }
    }
    const updated: Prisma.ServiceModel = {
      ...service,
      ...data,
      basePrice:
        data.basePrice !== undefined
          ? new Prisma.Decimal(data.basePrice)
          : service.basePrice,
      updatedAt: new Date(),
    }
    this.services.set(id, updated)
    return Promise.resolve(updated)
  }

  activate(id: string, organizationId: string): Promise<Prisma.ServiceModel> {
    const service = this.services.get(id)
    if (!service || service.organizationId !== organizationId) {
      return Promise.reject(new Error('service not found'))
    }
    const updated = { ...service, isActive: true, updatedAt: new Date() }
    this.services.set(id, updated)
    return Promise.resolve(updated)
  }

  deactivate(id: string, organizationId: string): Promise<Prisma.ServiceModel> {
    const service = this.services.get(id)
    if (!service || service.organizationId !== organizationId) {
      return Promise.reject(new Error('service not found'))
    }
    const updated = { ...service, isActive: false, updatedAt: new Date() }
    this.services.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, organizationId: string): Promise<void> {
    const service = this.services.get(id)
    if (!service || service.organizationId !== organizationId) {
      return Promise.reject(new Error('service not found'))
    }
    for (const item of this.workOrderItems.values()) {
      if (item.serviceId === id) {
        return Promise.reject(
          new ConflictException({ error: 'service_has_references' })
        )
      }
    }
    for (const warranty of this.warranties.values()) {
      if (warranty.serviceId === id) {
        return Promise.reject(
          new ConflictException({ error: 'service_has_references' })
        )
      }
    }
    this.services.delete(id)
    return Promise.resolve()
  }
}
