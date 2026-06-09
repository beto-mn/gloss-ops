import { z } from 'zod'

import { ResourceStatus } from '../enums'

export const BranchSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: z.nativeEnum(ResourceStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Branch = z.infer<typeof BranchSchema>
