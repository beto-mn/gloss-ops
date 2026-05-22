# Proposal: Auth Module

## Why

GlossOps needed a secure identity layer so users could register, log in, and be granted role-based access to the API without relying on long-lived, stateless tokens.

## What Changes

- Added `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` endpoints
- Implemented JWT access tokens (15 min) with minimal payload (`sub`, `memberId`)
- Implemented opaque UUID refresh tokens stored in Redis with 30-day TTL and rotation on use
- Added global `AuthGuard` that verifies Bearer tokens and loads full membership context from DB
- Added `RolesGuard` for per-route RBAC enforcement
- Added `@Public()`, `@Roles()`, and `@CurrentAccount()` decorators
- Added `PrismaService` global module and typed environment config

## Capabilities

- `auth`: Register, login, refresh, and logout with JWT + Redis-backed refresh tokens and role-based access control

## Impact

- `apps/api/src/auth/` — new module (service, controller, guards, decorators, DTOs, token store)
- `apps/api/src/prisma/` — new global PrismaService and PrismaModule
- `apps/api/src/config/envs.ts` — new typed env config
- `apps/api/src/app.module.ts` — AuthModule and APP_GUARD registration
- `apps/api/src/main.ts` — ValidationPipe added
- `packages/database/src/index.ts` — new barrel exporting PrismaClient and enums
