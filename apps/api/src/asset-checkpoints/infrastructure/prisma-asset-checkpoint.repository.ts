import { Injectable } from '@nestjs/common'
import { CheckpointType } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  AssetCheckpointRepositoryInterface,
  UpdateAssetCheckpointData,
  CreateAssetCheckpointData,
  AssetCheckpointRecord,
} from '@asset-checkpoints/interfaces'

type PrismaCheckpointRow = Awaited<
  ReturnType<PrismaService['assetCheckpoint']['findUniqueOrThrow']>
>

@Injectable()
export class PrismaAssetCheckpointRepository implements AssetCheckpointRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: PrismaCheckpointRow): AssetCheckpointRecord {
    return {
      id: row.id,
      workOrderId: row.workOrderId,
      type: row.type,
      processType: row.processType,
      mileage: row.mileage,
      fuelLevel: row.fuelLevel,
      generalCondition: row.generalCondition,
      note: row.note,
      photo: row.photo as string[],
      customerSignatureUrl: row.customerSignatureUrl,
      recordedAt: row.recordedAt,
      recordedById: row.recordedById,
    }
  }

  async create(
    data: CreateAssetCheckpointData
  ): Promise<AssetCheckpointRecord> {
    const row = await this.prisma.assetCheckpoint.create({
      data: {
        workOrderId: data.workOrderId,
        type: data.type,
        processType: data.processType ?? null,
        mileage: data.mileage ?? null,
        fuelLevel: data.fuelLevel ?? null,
        generalCondition: data.generalCondition,
        note: data.note ?? null,
        photo: data.photo ?? [],
        customerSignatureUrl: data.customerSignatureUrl ?? null,
        recordedById: data.recordedById,
      },
    })
    return this.toRecord(row)
  }

  async findAllByWorkOrder(
    workOrderId: string
  ): Promise<AssetCheckpointRecord[]> {
    const rows = await this.prisma.assetCheckpoint.findMany({
      where: { workOrderId },
      orderBy: { recordedAt: 'asc' },
    })
    return rows.map(r => this.toRecord(r))
  }

  async findById(id: string): Promise<AssetCheckpointRecord | null> {
    const row = await this.prisma.assetCheckpoint.findUnique({ where: { id } })
    return row ? this.toRecord(row) : null
  }

  async existsByWorkOrderAndType(
    workOrderId: string,
    type: CheckpointType
  ): Promise<boolean> {
    const count = await this.prisma.assetCheckpoint.count({
      where: { workOrderId, type },
    })
    return count > 0
  }

  async update(
    id: string,
    data: UpdateAssetCheckpointData
  ): Promise<AssetCheckpointRecord> {
    const row = await this.prisma.assetCheckpoint.update({
      where: { id },
      data: {
        ...(data.mileage !== undefined ? { mileage: data.mileage } : {}),
        ...(data.fuelLevel !== undefined ? { fuelLevel: data.fuelLevel } : {}),
        ...(data.generalCondition !== undefined
          ? { generalCondition: data.generalCondition }
          : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.photo !== undefined ? { photo: data.photo } : {}),
        ...(data.customerSignatureUrl !== undefined
          ? { customerSignatureUrl: data.customerSignatureUrl }
          : {}),
      },
    })
    return this.toRecord(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.assetCheckpoint.delete({ where: { id } })
  }
}
