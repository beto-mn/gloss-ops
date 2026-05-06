import { ConflictException } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import type {
  SupplierRepositoryInterface,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierQuery,
  SupplierPage,
} from '@suppliers/interfaces'

export class InMemorySupplierRepository implements SupplierRepositoryInterface {
  private readonly store = new Map<string, Prisma.SupplierModel>()
  private inventory: { id: string; supplierId: string }[] = []
  private purchaseOrders: { id: string; supplierId: string }[] = []

  seedInventory(items: { id: string; supplierId: string }[]): void {
    this.inventory = items
  }

  seedPurchaseOrders(items: { id: string; supplierId: string }[]): void {
    this.purchaseOrders = items
  }

  create(
    organizationId: string,
    data: CreateSupplierData
  ): Promise<Prisma.SupplierModel> {
    if (this.hasConflictingName(organizationId, data.name, null)) {
      return Promise.reject(
        new ConflictException({ error: 'name_already_exists' })
      )
    }

    const supplier: Prisma.SupplierModel = {
      id: crypto.randomUUID(),
      organizationId,
      name: data.name,
      contactName: data.contactName ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      note: data.note ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.store.set(supplier.id, supplier)
    return Promise.resolve(supplier)
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.SupplierModel | null> {
    const supplier = this.store.get(id)
    if (!supplier || supplier.organizationId !== organizationId)
      return Promise.resolve(null)
    return Promise.resolve(supplier)
  }

  findAll(organizationId: string, query: SupplierQuery): Promise<SupplierPage> {
    let items = Array.from(this.store.values()).filter(
      s => s.organizationId === organizationId
    )

    if (query.search) {
      const term = query.search.toLowerCase()
      items = items.filter(
        s =>
          s.name.toLowerCase().includes(term) ||
          (s.contactName?.toLowerCase().includes(term) ?? false) ||
          (s.email?.toLowerCase().includes(term) ?? false)
      )
    }

    items.sort((a, b) => a.name.localeCompare(b.name))

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
    organizationId: string,
    data: UpdateSupplierData
  ): Promise<Prisma.SupplierModel> {
    if (data.name !== undefined) {
      if (this.hasConflictingName(organizationId, data.name, id)) {
        return Promise.reject(
          new ConflictException({ error: 'name_already_exists' })
        )
      }
    }

    const existing = this.store.get(id)!
    const updated: Prisma.SupplierModel = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      ),
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _organizationId: string): Promise<void> {
    const hasInventory = this.inventory.some(i => i.supplierId === id)
    const hasPurchaseOrders = this.purchaseOrders.some(p => p.supplierId === id)

    if (hasInventory || hasPurchaseOrders) {
      return Promise.reject(
        new ConflictException({ error: 'supplier_has_references' })
      )
    }

    this.store.delete(id)
    return Promise.resolve()
  }

  private hasConflictingName(
    organizationId: string,
    name: string,
    excludeId: string | null
  ): boolean {
    return Array.from(this.store.values()).some(
      s =>
        s.organizationId === organizationId &&
        s.name === name &&
        s.id !== excludeId
    )
  }
}
