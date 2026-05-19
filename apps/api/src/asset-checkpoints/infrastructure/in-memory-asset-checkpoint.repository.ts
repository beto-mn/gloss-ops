import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'
import { CheckpointType } from '@glossops/database'

import type {
  AssetCheckpointRepositoryInterface,
  UpdateAssetCheckpointData,
  CreateAssetCheckpointData,
  AssetCheckpointRecord,
} from '@asset-checkpoints/interfaces'

@Injectable()
export class InMemoryAssetCheckpointRepository implements AssetCheckpointRepositoryInterface {
  readonly store = new Map<string, AssetCheckpointRecord>()

  create(data: CreateAssetCheckpointData): Promise<AssetCheckpointRecord> {
    const record: AssetCheckpointRecord = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      type: data.type,
      mileage: data.mileage ?? null,
      fuelLevel: data.fuelLevel ?? null,
      generalCondition: data.generalCondition,
      note: data.note ?? null,
      photo: data.photo ?? [],
      customerSignatureUrl: data.customerSignatureUrl ?? null,
      recordedAt: new Date(),
      recordedById: data.recordedById,
    }
    this.store.set(record.id, record)
    return Promise.resolve(record)
  }

  findAllByWorkOrder(workOrderId: string): Promise<AssetCheckpointRecord[]> {
    return Promise.resolve(
      Array.from(this.store.values()).filter(r => r.workOrderId === workOrderId)
    )
  }

  findById(id: string): Promise<AssetCheckpointRecord | null> {
    return Promise.resolve(this.store.get(id) ?? null)
  }

  existsByWorkOrderAndType(
    workOrderId: string,
    type: CheckpointType
  ): Promise<boolean> {
    return Promise.resolve(
      Array.from(this.store.values()).some(
        r => r.workOrderId === workOrderId && r.type === type
      )
    )
  }

  update(
    id: string,
    data: UpdateAssetCheckpointData
  ): Promise<AssetCheckpointRecord> {
    const existing = this.store.get(id)
    if (!existing) throw new Error(`AssetCheckpoint ${id} not found`)
    const updated: AssetCheckpointRecord = {
      ...existing,
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
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }
}
