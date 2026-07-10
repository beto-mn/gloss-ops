import { z } from 'zod'

/**
 * Roles an invitee can be granted. Mirrors the Prisma `Role` enum consumed by
 * the former `CreateInvitationDto` (`@IsEnum(Role)`); kept as a literal enum so
 * `@glossops/shared` stays free of a `@glossops/database` runtime dependency.
 */
export const InvitationRoleSchema = z.enum([
  'OWNER',
  'MANAGER',
  'TECHNICIAN',
  'FRONT_DESK',
])

/**
 * Body schema for `PATCH /organizations/me`. Both fields optional (partial
 * update). `logoUrl` is nullable so callers can explicitly clear it — this
 * mirrors the former `UpdateOrgDto` field type `string | null`.
 */
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().nullable().optional(),
})

/**
 * Body schema for `POST /organizations/invitations`. `branchId` is required and
 * must be an explicit UUID — never inferred from the caller's context. Mirrors
 * the former `CreateInvitationDto`.
 */
export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: InvitationRoleSchema,
  branchId: z.string().uuid(),
})

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>
