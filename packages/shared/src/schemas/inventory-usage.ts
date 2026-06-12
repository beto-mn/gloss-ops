import { z } from 'zod'

/**
 * Response shape for each entry returned by `GET /inventory/:id/usages`.
 *
 * Mirrors `Prisma.InventoryUsageModel`. Decimal fields (`quantityUsed`,
 * `costAtUsage`) come back as JSON strings — coerced to `number` so callers
 * always see a JS number.
 */
export const InventoryUsageSchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  inventoryId: z.string(),
  quantityUsed: z.coerce.number(),
  costAtUsage: z.coerce.number(),
  createdAt: z.string(),
})

export type InventoryUsage = z.infer<typeof InventoryUsageSchema>
