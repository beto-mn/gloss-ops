import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Body schema for `POST /suppliers`. Transform-free plain object so `apps/web`
 * can reuse it for form values via `z.infer`. Field constraints mirror the
 * former class-validator `CreateSupplierDto`.
 */
export const CreateSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  note: z.string().max(1000).optional(),
})

/**
 * Body schema for `PATCH /suppliers/:id`. Derived from the create schema via
 * `.partial()` (the Zod equivalent of `PartialType`) so the two never drift.
 */
export const UpdateSupplierSchema = CreateSupplierSchema.partial()

/**
 * Query schema for `GET /suppliers`. Pagination coerces string inputs; the
 * search filter stays a string.
 */
export const ListSuppliersQuerySchema = createPageQuerySchema({
  search: z.string().optional(),
})

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>
export type ListSuppliersQuery = z.infer<typeof ListSuppliersQuerySchema>
