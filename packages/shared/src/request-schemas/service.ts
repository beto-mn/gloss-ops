import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/** SAT clave format: alphanumeric only (mirrors `@Matches(/^[A-Za-z0-9]+$/)`). */
const claveRegex = /^[A-Za-z0-9]+$/

/**
 * Body schema for `POST /services`. Transform-free plain object so `apps/web`
 * can reuse it for form values via `z.infer`. Field constraints mirror the
 * former class-validator `CreateServiceDto`. `basePrice` keeps `>= 0`; the old
 * `maxDecimalPlaces: 2` hint is enforced by the `Decimal(10,2)` column, not here
 * (see APPLY_LOG deviation note).
 */
export const CreateServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  basePrice: z.number().min(0).optional(),
  claveProdServ: z.string().regex(claveRegex).max(15).optional(),
  claveUnidad: z.string().regex(claveRegex).max(10).optional(),
  warrantyDays: z.number().int().min(0).optional(),
  warrantyDescription: z.string().max(1000).optional(),
  warrantyTerm: z.string().max(1000).optional(),
})

/**
 * Body schema for `PATCH /services/:id`. Derived from the create schema via
 * `.partial()` (the Zod equivalent of `PartialType`) so the two never drift.
 */
export const UpdateServiceSchema = CreateServiceSchema.partial()

/**
 * Query schema for `GET /services`. Pagination coerces string inputs;
 * `includeInactive` reproduces the former class-transformer
 * `@Transform(({ value }) => value === 'true' || value === true)` boolean
 * coercion (any non-`true` value → `false`).
 */
export const ListServicesQuerySchema = createPageQuerySchema({
  search: z.string().optional(),
  includeInactive: z
    .union([z.string(), z.boolean()])
    .transform(value => value === 'true' || value === true)
    .optional(),
})

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>
export type ListServicesQuery = z.infer<typeof ListServicesQuerySchema>
