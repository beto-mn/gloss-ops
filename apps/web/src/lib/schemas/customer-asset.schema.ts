import { z } from 'zod'

import { AssetType, ResourceStatus } from '@glossops/shared'

export { AssetType }

export const ASSET_TYPES = Object.values(AssetType) as AssetType[]

export const createVehicleSchema = z.object({
  assetType: z.nativeEnum(AssetType),
  customAssetType: z.string().max(50).optional().or(z.literal('')),
  brandId: z.string().uuid('Selecciona una marca válida'),
  model: z.string().min(1, 'El modelo es requerido').max(100),
  year: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .or(z.literal(undefined)),
  identifier: z.string().min(1, 'La placa o VIN es requerida').max(50),
  country: z.string().length(2).optional().or(z.literal('')),
  color: z.string().max(30).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
})

export type CreateVehicleValues = z.infer<typeof createVehicleSchema>

export const updateVehicleSchema = createVehicleSchema.partial()

export type UpdateVehicleValues = z.infer<typeof updateVehicleSchema>

export interface CustomerAssetPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CustomerAssetPage {
  data: CustomerAsset[]
  meta: CustomerAssetPageMeta
}

export interface CustomerAsset {
  id: string
  customerId: string
  brandId: string | null
  assetType: AssetType
  customAssetType: string | null
  model: string
  year: number | null
  identifier: string
  country: string | null
  color: string | null
  note: string | null
  status: ResourceStatus
  createdAt: string
  updatedAt: string
}
