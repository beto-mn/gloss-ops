import type {
  AssetCondition,
  CheckpointType,
  FuelLevel,
} from '@glossops/database'

export interface AssetCheckpointRecord {
  id: string
  workOrderId: string
  type: CheckpointType
  mileage: number | null
  fuelLevel: FuelLevel | null
  generalCondition: AssetCondition
  note: string | null
  photo: string[]
  customerSignatureUrl: string | null
  recordedAt: Date
  recordedById: string
}

export interface CreateAssetCheckpointData {
  workOrderId: string
  type: CheckpointType
  mileage?: number
  fuelLevel?: FuelLevel
  generalCondition: AssetCondition
  note?: string
  photo?: string[]
  customerSignatureUrl?: string
  recordedById: string
}

export interface UpdateAssetCheckpointData {
  mileage?: number | null
  fuelLevel?: FuelLevel | null
  generalCondition?: AssetCondition
  note?: string | null
  photo?: string[]
  customerSignatureUrl?: string | null
}

export interface AssetCheckpointRepositoryInterface {
  create(data: CreateAssetCheckpointData): Promise<AssetCheckpointRecord>
  findAllByWorkOrder(workOrderId: string): Promise<AssetCheckpointRecord[]>
  findById(id: string): Promise<AssetCheckpointRecord | null>
  existsByWorkOrderAndType(
    workOrderId: string,
    type: CheckpointType
  ): Promise<boolean>
  update(
    id: string,
    data: UpdateAssetCheckpointData
  ): Promise<AssetCheckpointRecord>
  delete(id: string): Promise<void>
}
