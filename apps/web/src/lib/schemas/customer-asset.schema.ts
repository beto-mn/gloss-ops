import { z } from 'zod'

import {
  AssetType,
  CreateCustomerAssetSchema,
  ResourceStatus,
} from '@glossops/shared'

export { AssetType }

export const ASSET_TYPES = Object.values(AssetType) as AssetType[]

/**
 * Web vehicle form schema. Composes the shared `CreateCustomerAssetSchema`
 * field shape (`metadata` is omitted — the web form does not collect it) and
 * layers web-only UX concerns: Spanish messages for the required fields and
 * empty-string acceptance (`.or(z.literal(''))`) so RHF inputs default to `''`.
 * The submit handler maps `''`/`undefined` → `undefined` before hitting the API.
 */
export const createVehicleSchema = CreateCustomerAssetSchema.omit({
  metadata: true,
}).extend({
  brandId: z.string().uuid('Selecciona una marca válida'),
  model: z.string().min(1, 'El modelo es requerido').max(100),
  identifier: z.string().min(1, 'La placa o VIN es requerida').max(50),
  customAssetType: CreateCustomerAssetSchema.shape.customAssetType.or(
    z.literal('')
  ),
  country: CreateCustomerAssetSchema.shape.country.or(z.literal('')),
  color: CreateCustomerAssetSchema.shape.color.or(z.literal('')),
  note: CreateCustomerAssetSchema.shape.note.or(z.literal('')),
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
