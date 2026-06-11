import {
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  ServiceRepositoryInterface,
  CreateServiceData,
  UpdateServiceData,
  ServicePage,
} from '@services/interfaces'

import { SERVICE_REPOSITORY } from './services.tokens'
import { ListServicesDto } from './dto'

@Injectable()
export class ServicesService {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly services: ServiceRepositoryInterface
  ) {}

  create(
    organizationId: string,
    data: CreateServiceData
  ): Promise<Prisma.ServiceModel> {
    return this.services.create(organizationId, data)
  }

  findAll(organizationId: string, dto: ListServicesDto): Promise<ServicePage> {
    return this.services.findAll(organizationId, {
      search: dto.search,
      includeInactive: dto.includeInactive ?? false,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel> {
    const service = await this.services.findById(id, organizationId)
    if (!service) throw new NotFoundException({ error: 'service_not_found' })
    return service
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateServiceData
  ): Promise<Prisma.ServiceModel> {
    await this.findOne(id, organizationId)
    return this.services.update(id, organizationId, data)
  }

  async activate(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel> {
    const service = await this.findOne(id, organizationId)
    if (service.isActive)
      throw new ConflictException({ error: 'service_already_active' })
    return this.services.activate(id, organizationId)
  }

  async deactivate(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel> {
    const service = await this.findOne(id, organizationId)
    if (!service.isActive)
      throw new ConflictException({ error: 'service_already_inactive' })
    return this.services.deactivate(id, organizationId)
  }
}
