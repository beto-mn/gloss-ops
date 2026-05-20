import { Injectable } from '@nestjs/common'

import { PrismaService } from '@prisma'
import type {
  WarrantyRepositoryInterface,
  ItemForGeneration,
  CreateWarrantyData,
  WarrantyWithAsset,
  WarrantyRecord,
} from '@warranties/interfaces'

@Injectable()
export class PrismaWarrantyRepository implements WarrantyRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeForRecord = {
    workOrderItem: { include: { workOrder: { select: { branchId: true } } } },
  } as const

  private toRecord(row: any): WarrantyRecord {
    return {
      id: row.id,
      workOrderItemId: row.workOrderItemId,
      serviceId: row.serviceId,
      branchId: row.workOrderItem.workOrder.branchId,
      description: row.description,
      term: row.term,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      isVoid: row.isVoid,
      voidReason: row.voidReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async createMany(data: CreateWarrantyData[]): Promise<WarrantyRecord[]> {
    const rows = await this.prisma.$transaction(
      data.map(d =>
        this.prisma.warranty.create({
          data: {
            workOrderItemId: d.workOrderItemId,
            serviceId: d.serviceId,
            description: d.description,
            term: d.term,
            validFrom: d.validFrom,
            validUntil: d.validUntil,
          },
          include: this.includeForRecord,
        })
      )
    )
    return rows.map(row => this.toRecord(row))
  }

  async findItemsForGeneration(
    workOrderId: string
  ): Promise<ItemForGeneration[]> {
    const items = await this.prisma.workOrderItem.findMany({
      where: { workOrderId },
      include: {
        service: {
          select: {
            warrantyDays: true,
            warrantyDescription: true,
            warrantyTerm: true,
            name: true,
          },
        },
      },
    })
    return items.map(item => ({
      id: item.id,
      serviceId: item.serviceId,
      service: {
        warrantyDays: item.service.warrantyDays,
        warrantyDescription: item.service.warrantyDescription,
        warrantyTerm: item.service.warrantyTerm,
        name: item.service.name,
      },
    }))
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<WarrantyRecord | null> {
    const row = await this.prisma.warranty.findFirst({
      where: {
        id,
        workOrderItem: { workOrder: { branch: { organizationId } } },
      },
      include: this.includeForRecord,
    })
    return row ? this.toRecord(row) : null
  }

  async findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    const rows = await this.prisma.warranty.findMany({
      where: {
        workOrderItem: {
          workOrderId,
          workOrder: { branch: { organizationId } },
        },
      },
      include: this.includeForRecord,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(row => this.toRecord(row))
  }

  async findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    const rows = await this.prisma.warranty.findMany({
      where: {
        workOrderItem: { workOrder: { assetId, branch: { organizationId } } },
      },
      include: this.includeForRecord,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(row => this.toRecord(row))
  }

  async findForClaimValidation(
    warrantyId: string,
    organizationId: string
  ): Promise<WarrantyWithAsset | null> {
    const row = await this.prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        workOrderItem: { workOrder: { branch: { organizationId } } },
      },
      include: {
        workOrderItem: {
          include: { workOrder: { select: { assetId: true } } },
        },
      },
    })
    if (!row) return null
    return {
      id: row.id,
      isVoid: row.isVoid,
      validUntil: row.validUntil,
      assetId: row.workOrderItem.workOrder.assetId,
    }
  }

  async void(id: string, reason: string): Promise<WarrantyRecord> {
    const row = await this.prisma.warranty.update({
      where: { id },
      data: { isVoid: true, voidReason: reason },
      include: this.includeForRecord,
    })
    return this.toRecord(row)
  }
}
