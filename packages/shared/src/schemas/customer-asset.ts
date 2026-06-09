import { z } from 'zod'

import { AssetType, ResourceStatus } from '../enums'

export const CustomerAssetSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  brandId: z.string().nullable(),
  assetType: z.nativeEnum(AssetType),
  customAssetType: z.string().nullable(),
  model: z.string(),
  year: z.number().nullable(),
  identifier: z.string(),
  country: z.string().nullable(),
  color: z.string().nullable(),
  note: z.string().nullable(),
  status: z.nativeEnum(ResourceStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CustomerAsset = z.infer<typeof CustomerAssetSchema>
