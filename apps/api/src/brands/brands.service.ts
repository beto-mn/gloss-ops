import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import type {
  BrandRepositoryInterface,
  CreateBrandData,
  UpdateBrandData,
  BrandPage,
} from '@brands/interfaces'
import type { ListBrandsDto } from '@brands/dto'

import { BRAND_REPOSITORY } from './brands.tokens'

@Injectable()
export class BrandsService {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepositoryInterface
  ) {}

  create(organizationId: string, data: CreateBrandData) {
    return this.brands.create(organizationId, data)
  }

  findAll(organizationId: string, dto: ListBrandsDto): Promise<BrandPage> {
    return this.brands.findAll(organizationId, {
      search: dto.search,
      category: dto.category,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, organizationId: string) {
    const brand = await this.brands.findById(id, organizationId)
    if (!brand) throw new NotFoundException({ error: 'brand_not_found' })
    return brand
  }

  async update(id: string, organizationId: string, data: UpdateBrandData) {
    const brand = await this.findOne(id, organizationId)
    if (brand.isSeeded)
      throw new ForbiddenException({ error: 'brand_is_seeded' })
    return this.brands.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const brand = await this.findOne(id, organizationId)
    if (brand.isSeeded)
      throw new ForbiddenException({ error: 'brand_is_seeded' })
    await this.brands.delete(id, organizationId)
  }
}
