import { z } from 'zod'

import { AssetTypeSchema } from './customer-asset'
import { createPageQuerySchema } from './pagination'

/** Kebab-case slug (mirrors `@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)`). */
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Body schema for `POST /brands`. Transform-free plain object so `apps/web` can
 * reuse it for form values via `z.infer`. Field constraints mirror the former
 * class-validator `CreateBrandDto`; `category` reuses the shared `AssetType`
 * enum.
 */
export const CreateBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(slugRegex),
  category: AssetTypeSchema,
  logoUrl: z.string().url().max(500).optional(),
})

/**
 * Body schema for `PATCH /brands/:id`. Derived from the create schema via
 * `.partial()` (the Zod equivalent of `PartialType`) so the two never drift.
 */
export const UpdateBrandSchema = CreateBrandSchema.partial()

/**
 * Query schema for `GET /brands`. Pagination coerces string inputs; the search
 * and category filters stay strings. `limit` is capped at 500 (not the shared
 * default of 100) to match the former `ListBrandsDto` `@Max(500)`.
 */
export const ListBrandsQuerySchema = createPageQuerySchema({
  search: z.string().optional(),
  category: AssetTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>
export type ListBrandsQuery = z.infer<typeof ListBrandsQuerySchema>
