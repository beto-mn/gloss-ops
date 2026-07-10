import { z } from 'zod'

import { createPageQuerySchema } from './pagination'

/**
 * Activity action. Mirrors the Prisma `ActivityAction` enum; kept as a literal
 * enum so `@glossops/shared` stays free of a `@glossops/database` runtime
 * dependency.
 */
export const ActivityActionSchema = z.enum([
  'CREATED',
  'UPDATED',
  'DELETED',
  'STATUS_CHANGED',
  'ASSIGNED',
])

/**
 * Query schema for `GET /activity-logs` (read-only module). Pagination coerces
 * string inputs; `entity` is a free-form string, `entityId` a UUID, and
 * `action` the `ActivityAction` enum. The former `ListActivityLogsDto` `limit`
 * had no `@Max`, so `limit` is overridden here to stay uncapped (only
 * `.min(1)`), preserving the old behavior.
 */
export const ListActivityLogsQuerySchema = createPageQuerySchema({
  entity: z.string().optional(),
  entityId: z.string().uuid().optional(),
  action: ActivityActionSchema.optional(),
  limit: z.coerce.number().int().min(1).optional(),
})

export type ListActivityLogsQuery = z.infer<typeof ListActivityLogsQuerySchema>
