import { ConflictException } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import type {
  BrandRepositoryInterface,
  CreateBrandData,
  UpdateBrandData,
  BrandQuery,
  BrandPage,
} from '@brands/interfaces'

export class InMemoryBrandRepository implements BrandRepositoryInterface {
  private readonly store = new Map<string, Prisma.BrandModel>()
  private customerAssets: { id: string; brandId: string }[] = []
  private inventory: { id: string; brandId: string }[] = []

  seedGlobalBrands(brands: Prisma.BrandModel[]): void {
    for (const brand of brands) this.store.set(brand.id, brand)
  }

  seedCustomerAssets(items: { id: string; brandId: string }[]): void {
    this.customerAssets = items
  }

  seedInventory(items: { id: string; brandId: string }[]): void {
    this.inventory = items
  }

  create(
    organizationId: string,
    data: CreateBrandData
  ): Promise<Prisma.BrandModel> {
    if (this.hasConflictingSlug(organizationId, data.slug, null)) {
      return Promise.reject(
        new ConflictException({ error: 'slug_already_exists' })
      )
    }

    const brand: Prisma.BrandModel = {
      id: crypto.randomUUID(),
      organizationId,
      name: data.name,
      slug: data.slug,
      category: data.category,
      logoUrl: data.logoUrl ?? null,
      isSeeded: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.store.set(brand.id, brand)
    return Promise.resolve(brand)
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null> {
    const brand = this.store.get(id)
    if (!brand) return Promise.resolve(null)
    if (brand.organizationId === organizationId || brand.isSeeded) {
      return Promise.resolve(brand)
    }
    return Promise.resolve(null)
  }

  findAll(organizationId: string, query: BrandQuery): Promise<BrandPage> {
    let items = Array.from(this.store.values()).filter(
      b => b.organizationId === organizationId || b.isSeeded
    )

    if (query.search) {
      const term = query.search.toLowerCase()
      items = items.filter(b => b.name.toLowerCase().includes(term))
    }

    if (query.category) {
      items = items.filter(b => b.category === query.category)
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
    data: UpdateBrandData
  ): Promise<Prisma.BrandModel> {
    if (data.slug !== undefined) {
      if (this.hasConflictingSlug(organizationId, data.slug, id)) {
        return Promise.reject(
          new ConflictException({ error: 'slug_already_exists' })
        )
      }
    }

    const existing = this.store.get(id)!
    const updated: Prisma.BrandModel = {
      ...existing,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _organizationId: string): Promise<void> {
    const hasCustomerAssets = this.customerAssets.some(a => a.brandId === id)
    const hasInventory = this.inventory.some(i => i.brandId === id)

    if (hasCustomerAssets || hasInventory) {
      return Promise.reject(
        new ConflictException({ error: 'brand_has_references' })
      )
    }

    this.store.delete(id)
    return Promise.resolve()
  }

  private hasConflictingSlug(
    organizationId: string,
    slug: string,
    excludeId: string | null
  ): boolean {
    return Array.from(this.store.values()).some(
      b =>
        b.organizationId === organizationId &&
        b.slug === slug &&
        b.id !== excludeId
    )
  }
}
