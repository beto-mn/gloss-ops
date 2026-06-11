import {
  UnprocessableEntityException,
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'

import { AssetType } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type {
  CustomerAssetRepositoryInterface,
  CustomerAssetPage,
  CreateCustomerAssetData,
  UpdateCustomerAssetData,
} from '@customer-assets/interfaces'

import { CUSTOMER_ASSET_REPOSITORY } from './customer-assets.tokens'
import type { ListCustomerAssetsDto } from './dto'

@Injectable()
export class CustomerAssetsService {
  constructor(
    @Inject(CUSTOMER_ASSET_REPOSITORY)
    private readonly repo: CustomerAssetRepositoryInterface
  ) {}

  async create(
    organizationId: string,
    customerId: string,
    data: CreateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel> {
    const customerExists = await this.repo.customerExistsInOrg(
      customerId,
      organizationId
    )
    if (!customerExists) {
      throw new NotFoundException({ error: 'customer_not_found' })
    }

    if (data.assetType === AssetType.OTHER && !data.customAssetType) {
      throw new UnprocessableEntityException({
        error: 'custom_asset_type_required',
      })
    }

    if (data.assetType !== AssetType.OTHER && data.customAssetType) {
      throw new UnprocessableEntityException({
        error: 'custom_asset_type_not_allowed',
      })
    }

    if (data.brandId) {
      const brand = await this.repo.findBrandForOrg(
        data.brandId,
        organizationId
      )
      if (!brand) throw new NotFoundException({ error: 'brand_not_found' })
    }

    if (data.country && data.identifier) {
      const existing = await this.repo.findByIdentifier(
        data.country,
        data.identifier,
        organizationId
      )
      if (existing) {
        throw new ConflictException({ error: 'identifier_already_exists' })
      }
    }

    return this.repo.create(customerId, data)
  }

  async findAllByCustomer(
    organizationId: string,
    customerId: string,
    dto: ListCustomerAssetsDto
  ): Promise<CustomerAssetPage> {
    const customerExists = await this.repo.customerExistsInOrg(
      customerId,
      organizationId
    )
    if (!customerExists) {
      throw new NotFoundException({ error: 'customer_not_found' })
    }

    const statusFilter =
      dto.status === 'INACTIVE'
        ? ('INACTIVE' as const)
        : dto.status === 'ALL'
          ? 'ALL'
          : ('ACTIVE' as const)

    return this.repo.findAllByCustomer(customerId, organizationId, {
      status: statusFilter,
      assetType: dto.assetType,
      search: dto.search,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel> {
    const asset = await this.repo.findById(id, organizationId)
    if (!asset)
      throw new NotFoundException({ error: 'customer_asset_not_found' })
    return asset
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel> {
    const current = await this.findOne(id, organizationId)

    const effectiveAssetType = data.assetType ?? current.assetType
    const effectiveCustomAssetType =
      'customAssetType' in data ? data.customAssetType : current.customAssetType

    if (effectiveAssetType === AssetType.OTHER && !effectiveCustomAssetType) {
      throw new UnprocessableEntityException({
        error: 'custom_asset_type_required',
      })
    }

    if (effectiveAssetType !== AssetType.OTHER && effectiveCustomAssetType) {
      throw new UnprocessableEntityException({
        error: 'custom_asset_type_not_allowed',
      })
    }

    if ('brandId' in data && data.brandId) {
      const brand = await this.repo.findBrandForOrg(
        data.brandId,
        organizationId
      )
      if (!brand) throw new NotFoundException({ error: 'brand_not_found' })
    }

    const effectiveIdentifier =
      'identifier' in data ? data.identifier : current.identifier
    const effectiveCountry = 'country' in data ? data.country : current.country

    if (effectiveCountry && effectiveIdentifier) {
      const identifierChanged =
        effectiveIdentifier !== current.identifier ||
        effectiveCountry !== current.country
      if (identifierChanged) {
        const existing = await this.repo.findByIdentifier(
          effectiveCountry,
          effectiveIdentifier,
          organizationId
        )
        if (existing && existing.id !== id) {
          throw new ConflictException({ error: 'identifier_already_exists' })
        }
      }
    }

    return this.repo.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId)
    await this.repo.softDelete(id, organizationId)
  }
}
