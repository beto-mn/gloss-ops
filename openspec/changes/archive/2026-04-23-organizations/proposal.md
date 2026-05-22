# Proposal: Organizations Module

## Why

After registration, accounts had no organization context — every protected endpoint returned null `organizationId` and `role`, making it impossible to enforce multi-tenant access control or allow shops to manage their own teams.

## What Changes

- Updated `POST /auth/register` to atomically create `Account` + `Organization` + `Branch` + `OrganizationMember (OWNER)` in sequence
- Simplified JWT payload from `{ sub, memberId }` to `{ sub, email }` — org context is resolved per-request from the `X-Organization-Id` header instead of being baked into the token
- Updated `AuthGuard` to read `X-Organization-Id`, look up the `OrganizationMember`, and populate full `AuthContext`
- Added `OrganizationsModule` with endpoints for org CRUD, member listing, and Redis-backed single-use invitations
- Added `InvitationStore` backed by Redis with configurable TTL and single-use delete-on-accept guarantee
- Added multi-org support: one account can belong to up to 5 organizations with different roles in each

## Capabilities

- `organizations`: Organization management, member listing, and Redis-backed invitation flow with X-Organization-Id header-based context resolution

## Impact

- `apps/api/src/auth/` — RegisterDto extended, JWT payload simplified, AuthGuard rewritten, AuthService updated
- `apps/api/src/organizations/` — new module (service, controller, interfaces, infrastructure, DTOs)
- `apps/api/src/config/envs.ts` — `INVITATION_EXPIRES_IN_DAYS`, `APP_FRONTEND_URL` added
- `apps/api/tsconfig.paths.json` — `@organizations/*` path aliases added
- `apps/api/src/app.module.ts` — OrganizationsModule registered
