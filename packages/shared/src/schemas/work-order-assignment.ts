import { z } from 'zod'

import { AssignmentRole } from '../enums'

/**
 * Response shape returned by `POST /work-orders/:id/assignments` and each
 * entry of `GET /work-orders/:id/assignments`.
 *
 * The repository emits both the flat `accountId` and a nested `account`
 * block, so the schema covers both. Distinct from `WorkOrderAssignmentSchema`
 * (in `work-order.ts`) only by naming — same shape, but this name documents
 * that it is the controller's response contract.
 */
export const WorkOrderAssignmentResponseSchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  memberId: z.string(),
  accountId: z.string(),
  role: z.nativeEnum(AssignmentRole),
  assignedAt: z.string(),
  account: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
  }),
})

export type WorkOrderAssignmentResponse = z.infer<
  typeof WorkOrderAssignmentResponseSchema
>
