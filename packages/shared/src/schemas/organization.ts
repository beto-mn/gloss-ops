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

/**
 * Response shape for `GET /organizations` — extends the org with the
 * caller's role inside that org.
 */
export const OrganizationWithRoleSchema = OrganizationSchema.extend({
  role: z.nativeEnum(Role),
})

export const OrganizationMemberSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  accountId: z.string(),
  role: z.nativeEnum(Role),
  joinedAt: z.string(),
})

/**
 * Response shape for `GET /organizations/me/members` — membership row joined
 * with a slim account block.
 */
export const MemberWithAccountSchema = OrganizationMemberSchema.extend({
  account: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
})

/**
 * Response shape for `POST /organizations/invitations`. Only the invitation
 * URL is exposed to the client — the token is embedded in the URL.
 */
export const InvitationCreatedSchema = z.object({
  invitationUrl: z.string(),
})

export type Organization = z.infer<typeof OrganizationSchema>
export type OrganizationWithRole = z.infer<typeof OrganizationWithRoleSchema>
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>
export type MemberWithAccount = z.infer<typeof MemberWithAccountSchema>
export type InvitationCreated = z.infer<typeof InvitationCreatedSchema>
