import { z } from 'zod'

/**
 * Assignment role. Mirrors the Prisma `AssignmentRole` enum; kept as a literal
 * enum so `@glossops/shared` stays free of a `@glossops/database` runtime
 * dependency.
 */
export const AssignmentRoleSchema = z.enum(['LEAD', 'ASSISTANT'])

/**
 * Body schema for `POST /work-orders/:workOrderId/assignments`. Transform-free
 * plain object. Mirrors the former class-validator
 * `CreateWorkOrderAssignmentDto` (`memberId` UUID, optional `role` enum).
 */
export const CreateWorkOrderAssignmentSchema = z.object({
  memberId: z.string().uuid(),
  role: AssignmentRoleSchema.optional(),
})

export type CreateWorkOrderAssignmentInput = z.infer<
  typeof CreateWorkOrderAssignmentSchema
>
