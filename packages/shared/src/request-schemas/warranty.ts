import { z } from 'zod'

/**
 * Body schema for `POST /warranties/:id/void`. Transform-free plain object.
 * Mirrors the former class-validator `VoidWarrantyDto` (`reason` required,
 * non-empty). Warranties expose no paginated list endpoint (only `findOne` by
 * route param and `void`), so no query schema is published for this module.
 */
export const VoidWarrantySchema = z.object({
  reason: z.string().min(1),
})

export type VoidWarrantyInput = z.infer<typeof VoidWarrantySchema>
