import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Asset kinds. Mirrors the Prisma `AssetType` enum consumed by the former
 * `CreateCustomerAssetDto` (`@IsEnum(AssetType)`); kept as a literal enum so
 * `@glossops/shared` stays free of a `@glossops/database` runtime dependency.
 */
export const AssetTypeSchema = z.enum([
  'VEHICLE',
  'MOTORCYCLE',
  'BOAT',
  'JET_SKI',
  'TRUCK',
  'ATV_UTV',
  'AIRCRAFT',
  'OTHER',
])

/**
 * Body schema for `POST /customers/:customerId/assets`. Transform-free plain
 * object so `apps/web` can reuse it for form values via `z.infer`. Field
 * constraints mirror the former class-validator `CreateCustomerAssetDto`;
 * `metadata` is the free-form nested object (`@IsObject`).
 */
export const CreateCustomerAssetSchema = z.object({
  assetType: AssetTypeSchema,
  customAssetType: z.string().min(1).max(50).optional(),
  brandId: z.string().uuid(),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100).optional(),
  identifier: z.string().min(1).max(50),
  country: z.string().length(2).optional(),
  color: z.string().max(30).optional(),
  metadata: z.record(z.unknown()).optional(),
  note: z.string().max(500).optional(),
})

/**
 * Body schema for `PATCH /customer-assets/:id`. Derived from the create schema
 * via `.partial()` (the Zod equivalent of `PartialType`) so the two never drift.
 */
export const UpdateCustomerAssetSchema = CreateCustomerAssetSchema.partial()

/**
 * Query schema for `GET /customers/:customerId/assets`. Pagination coerces
 * string inputs; the status/assetType filters and search stay strings.
 */
export const ListCustomerAssetsQuerySchema = createPageQuerySchema({
  status: z.string().optional(),
  assetType: AssetTypeSchema.optional(),
  search: z.string().optional(),
})

export type CreateCustomerAssetInput = z.infer<typeof CreateCustomerAssetSchema>
export type UpdateCustomerAssetInput = z.infer<typeof UpdateCustomerAssetSchema>
export type ListCustomerAssetsQuery = z.infer<
  typeof ListCustomerAssetsQuerySchema
>
