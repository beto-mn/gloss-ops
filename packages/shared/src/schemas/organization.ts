import { z } from 'zod'

import { ResourceStatus, Role } from '../enums'

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  status: z.nativeEnum(ResourceStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const OrganizationMemberSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  accountId: z.string(),
  role: z.nativeEnum(Role),
  joinedAt: z.string(),
})

export type Organization = z.infer<typeof OrganizationSchema>
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>
