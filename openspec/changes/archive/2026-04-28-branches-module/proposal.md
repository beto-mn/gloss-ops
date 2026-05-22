# Proposal: Branches Module

## Why

After dropping `Branch.isMain`, branches became peers with no way to create, list, or manage them via the API. The invitation flow already required a `branchId`, but without endpoints to list branches the frontend had nothing to populate the branch selector with.

## What Changes

- Added `status` and `deletedAt` columns to the `Branch` model
- Added `ON DELETE CASCADE` to `OrganizationMember.branch` relation
- Created the full `branches/` module with the standard repository pattern (interface + Prisma + in-memory + tokens + module)
- Added 5 endpoints under `/branches`: `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- Soft delete only via API; hard delete runs via a `BranchCleanupService` cron after 30 days
- `POST /branches` and `PATCH /branches/:id` enforce unique branch names within an org (ACTIVE only)
- `DELETE /branches/:id` returns 422 if the target is the last ACTIVE branch
- Added TS path aliases `@branches`, `@branches/dto`, `@branches/interfaces`
- Registered `BranchesModule` in `AppModule`

## Capabilities

- `branches-module`: Full CRUD for branches scoped to an organization, with soft-delete-only API, 30-day cron cleanup, and last-branch protection

## Impact

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/`
- `apps/api/tsconfig.paths.json`
- `apps/api/jest.config.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/branches/` (all files — new module)
