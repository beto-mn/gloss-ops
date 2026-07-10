import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Body schema for `POST /branches`. Transform-free plain object so `apps/web`
 * can reuse it for form values via `z.infer`. Field constraints mirror the
 * former class-validator `CreateBranchDto`.
 */
export const CreateBranchSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(254).optional(),
})

/**
 * Body schema for `PATCH /branches/:id`. Derived from the create schema via
 * `.partial()` (the Zod equivalent of `PartialType`) so the two never drift.
 */
export const UpdateBranchSchema = CreateBranchSchema.partial()

/**
 * Query schema for `GET /branches`. Pagination coerces string inputs; the
 * status filter and search stay strings (the service applies its own defaults).
 */
export const ListBranchesQuerySchema = createPageQuerySchema({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional(),
  search: z.string().optional(),
})

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>
export type UpdateBranchInput = z.infer<typeof UpdateBranchSchema>
export type ListBranchesQuery = z.infer<typeof ListBranchesQuerySchema>
