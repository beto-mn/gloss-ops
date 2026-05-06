import { NotFoundException, Injectable, Inject } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  SupplierRepositoryInterface,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierPage,
} from '@suppliers/interfaces'

import { SUPPLIER_REPOSITORY } from './suppliers.tokens'
import { ListSuppliersDto } from './dto'

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepositoryInterface
  ) {}

  create(
    organizationId: string,
    data: CreateSupplierData
  ): Promise<Prisma.SupplierModel> {
    return this.suppliers.create(organizationId, data)
  }

  findAll(
    organizationId: string,
    dto: ListSuppliersDto
  ): Promise<SupplierPage> {
    return this.suppliers.findAll(organizationId, {
      search: dto.search,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<Prisma.SupplierModel> {
    const supplier = await this.suppliers.findById(id, organizationId)
    if (!supplier) throw new NotFoundException({ error: 'supplier_not_found' })
    return supplier
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateSupplierData
  ): Promise<Prisma.SupplierModel> {
    await this.findOne(id, organizationId)
    return this.suppliers.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId)
    await this.suppliers.delete(id, organizationId)
  }
}
