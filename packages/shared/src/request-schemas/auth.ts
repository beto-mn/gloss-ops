import { z } from 'zod'

/**
 * Body schema for `POST /auth/login`. Transform-free plain object so `apps/web`
 * can reuse it for form values via `z.infer`. Mirrors the former class-validator
 * `LoginDto` (`@IsEmail`, `@IsString`).
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

/**
 * Body schema for `POST /auth/register`. Refinement-free — cross-field checks
 * (e.g. `confirmPassword`) are layered in `apps/web` (group 3), never here. The
 * min/max-length rules mirror the former `RegisterDto` so the auth e2e
 * "400 for invalid body" case still fails validation.
 */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(100),
  orgName: z.string().min(2).max(100),
})

/**
 * Body schema for `POST /auth/refresh` (and `/auth/logout`). The controller reads
 * `refreshToken` off the body; this schema documents that shape for reuse.
 */
export const RefreshSchema = z.object({
  refreshToken: z.string(),
})

/**
 * Body schema for `POST /organizations/invitations/accept`. `token` is required;
 * the profile fields are optional (set only when the invitee has no account yet).
 * Mirrors the former `AcceptInvitationDto`.
 */
export const AcceptInvitationSchema = z.object({
  token: z.string(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  password: z.string().min(8).max(72).optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type RefreshInput = z.infer<typeof RefreshSchema>
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>
