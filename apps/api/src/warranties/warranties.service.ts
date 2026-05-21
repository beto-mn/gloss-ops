import {
  UnprocessableEntityException,
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'
import { ActivityAction } from '@glossops/database'

import type {
  WarrantyRepositoryInterface,
  CreateWarrantyData,
  WarrantyRecord,
} from '@warranties/interfaces'

import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WARRANTY_REPOSITORY } from './warranties.tokens'

@Injectable()
export class WarrantyService {
  constructor(
    @Inject(WARRANTY_REPOSITORY)
    private readonly repo: WarrantyRepositoryInterface,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async generateForWorkOrder(
    workOrderId: string,
    organizationId: string,
    completedAt: Date
  ): Promise<void> {
    const items = await this.repo.findItemsForGeneration(workOrderId)
    const qualifying = items.filter(
      item => item.service.warrantyDays != null && item.service.warrantyDays > 0
    )
    if (qualifying.length === 0) return

    const data: CreateWarrantyData[] = qualifying.map(item => {
      const validUntil = new Date(completedAt)
      validUntil.setDate(validUntil.getDate() + item.service.warrantyDays!)
      return {
        workOrderItemId: item.id,
        serviceId: item.serviceId,
        description: item.service.warrantyDescription ?? item.service.name,
        term: item.service.warrantyTerm ?? null,
        validFrom: completedAt,
        validUntil,
      }
    })
    await this.repo.createMany(data)
  }

  async validateClaim(
    warrantyClaimId: string,
    assetId: string,
    organizationId: string
  ): Promise<void> {
    const warranty = await this.repo.findForClaimValidation(
      warrantyClaimId,
      organizationId
    )
    if (!warranty) throw new NotFoundException({ error: 'warranty_not_found' })
    if (warranty.isVoid)
      throw new UnprocessableEntityException({ error: 'warranty_voided' })
    if (warranty.validUntil < new Date())
      throw new UnprocessableEntityException({ error: 'warranty_expired' })
    if (warranty.assetId !== assetId)
      throw new UnprocessableEntityException({
        error: 'warranty_asset_mismatch',
      })
  }

  async findOne(id: string, organizationId: string): Promise<WarrantyRecord> {
    const record = await this.repo.findById(id, organizationId)
    if (!record) throw new NotFoundException({ error: 'warranty_not_found' })
    return record
  }

  findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return this.repo.findByWorkOrder(workOrderId, organizationId)
  }

  findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return this.repo.findByAsset(assetId, organizationId)
  }

  async void(
    id: string,
    reason: string,
    organizationId: string,
    accountId: string
  ): Promise<WarrantyRecord> {
    const record = await this.findOne(id, organizationId)
    if (record.isVoid)
      throw new ConflictException({ error: 'warranty_already_voided' })
    const updated = await this.repo.void(id, reason)
    await this.activityLogs.record({
      organizationId,
      branchId: record.branchId,
      accountId,
      action: ActivityAction.UPDATED,
      entity: 'Warranty',
      entityId: id,
      metadata: { isVoid: true, reason },
    })
    return updated
  }
}
