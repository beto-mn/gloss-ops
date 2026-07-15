import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Body schema for `POST /customers`. Transform-free plain object so `apps/web`
 * can reuse it for form values via `z.infer`. Field constraints mirror the
 * former class-validator DTO (min/max lengths, optional fields).
 */
export const CreateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().max(254).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(255).optional(),
  taxId: z.string().max(20).optional(),
  fiscalRegime: z.string().max(10).optional(),
  zipCode: z.string().max(10).optional(),
  source: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})

/**
 * Body schema for `PATCH /customers/:id`. Derived from the create schema via
 * `.partial()` (the Zod equivalent of `PartialType`) so the two never drift.
 */
export const UpdateCustomerSchema = CreateCustomerSchema.partial()

/**
 * Query schema for `GET /customers`. Pagination fields coerce string inputs to
 * numbers; the module-specific filters (status, search, sort) stay strings.
 */
export const ListCustomersQuerySchema = createPageQuerySchema({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>
export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>
