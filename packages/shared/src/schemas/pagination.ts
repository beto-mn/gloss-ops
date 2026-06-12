import { z } from 'zod'

/**
 * Generic page-meta wrapper used by the majority of paginated list endpoints
 * (`Customer`, `WorkOrder`, `PurchaseOrder`, `Inventory`, `CustomerAsset`).
 *
 * Shape: `{ data, meta: { page, limit, total, totalPages, hasNext, hasPrev } }`.
 *
 * Two endpoints (`Invoice`, `ActivityLog`) use the flat variant — see
 * `createFlatPageSchema` for that.
 */
export const createPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  })

/**
 * Flat page wrapper for endpoints that publish `{ data, total, page, limit }`
 * directly (`Invoice`, `ActivityLog`).
 *
 * The split is by current API truth (decision D1 in design.md); both shapes
 * already exist in the controllers and we adapt the schemas to match.
 */
export const createFlatPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  })
