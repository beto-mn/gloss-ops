import { z } from 'zod'

/**
 * Pagination query fields shared by every paginated list endpoint.
 *
 * Query params arrive as strings, so `page`/`limit` use `z.coerce.number()`
 * to reproduce the class-transformer `@Type(() => Number)` coercion that the
 * previous class-validator DTOs relied on. Both are optional; callers apply
 * their own defaults (typically `page = 1`, `limit = 20`).
 */
export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

/**
 * Builds a list-query schema by extending the shared pagination fields with
 * module-specific filters (search, status, sort, ...).
 *
 * @example
 * export const ListCustomersQuerySchema = createPageQuerySchema({
 *   status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional(),
 * })
 */
export const createPageQuerySchema = <T extends z.ZodRawShape>(fields: T) =>
  PageQuerySchema.extend(fields)

export type PageQuery = z.infer<typeof PageQuerySchema>
