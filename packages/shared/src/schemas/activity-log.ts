import { z } from 'zod'

import { ActivityAction } from '../enums'

export const ActivityLogSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  branchId: z.string().nullable(),
  accountId: z.string().nullable(),
  action: z.nativeEnum(ActivityAction),
  entity: z.string(),
  entityId: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
})

export type ActivityLog = z.infer<typeof ActivityLogSchema>
