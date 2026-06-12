import { z } from 'zod'

import { AssetCondition, CheckpointType, FuelLevel } from '../enums'

export const AssetCheckpointSchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  type: z.nativeEnum(CheckpointType),
  processType: z.string().nullable(),
  mileage: z.number().nullable(),
  fuelLevel: z.nativeEnum(FuelLevel).nullable(),
  generalCondition: z.nativeEnum(AssetCondition),
  note: z.string().nullable(),
  photo: z.array(z.string()),
  customerSignatureUrl: z.string().nullable(),
  recordedAt: z.string(),
  recordedById: z.string(),
})

export type AssetCheckpoint = z.infer<typeof AssetCheckpointSchema>
