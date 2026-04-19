# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GlossOps is a **multi-tenant SaaS platform** for automotive wrap, detailing, and restyling shops. It replaces WhatsApp + spreadsheet workflows with a structured operational system covering customers, vehicles, work orders, and inventory.

The project is in early development — the README and LICENSE exist but the monorepo structure has not been scaffolded yet.

## Planned Architecture

### Monorepo Structure (to be created)

```
glossops/
├── apps/
│   ├── web/        # Next.js 14+ (App Router), TypeScript, Tailwind CSS
│   └── api/        # NestJS, TypeScript, Prisma ORM
├── packages/
│   ├── database/   # Prisma schema, migrations, seed scripts
│   └── shared/     # Shared types, DTOs, Zod schemas
├── docker-compose.yml
└── .env.example
```

### Multi-Tenancy Model

Every resource is scoped to an **Organization** (the tenant). All database queries must filter by `organizationId`. The `OrganizationMember` table is the join between `User` and `Organization`, and holds the user's `role` (Owner, Manager, Technician, Front Desk).

### Core Domain Entities

The domain revolves around a shop's daily operations:

- `Organization` → tenant boundary, all data isolated here
- `Customer` → `Vehicle` → `WorkOrder` → `WorkOrderItem` (linked to `Service`)
- `WorkOrder` → `InventoryUsage` → `InventoryItem` or `WrapRoll`
- `Supplier` → supplies both `InventoryItem` and `WrapRoll`
- `ActivityLog` → append-only audit trail of operational events

`WrapRoll` is a domain-specific entity with fields like `brand`, `series`, `finish`, `width`, `remainingLength`, and `lotNumber` — distinct from general `InventoryItem`.

### Auth & RBAC

- JWT-based authentication
- Role-based access control with four roles: **Owner**, **Manager**, **Technician**, **Front Desk**
- Role is stored in `OrganizationMember.role`, not on the `User` itself — a user can have different roles in different organizations

## Import Organization

Imports are grouped into six tiers separated by a blank line. Within each tier, single-line imports come first (longest to shortest), then multi-line imports (longest to shortest).

```ts
// Tier 1 — external public npm packages
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  UnauthorizedException,
  ExecutionContext,
  CanActivate,
  Injectable,
} from '@nestjs/common'

// Tier 2 — private/internal company libraries (e.g. @retorna-tech/*, @company/*)
//           libraries owned by you or your company, not published publicly
import { SomeUtil } from '@retorna-tech/utils'

// Tier 3 — workspace/monorepo packages (@glossops/*)
import { Role } from '@glossops/database'

// Tier 4 — TypeScript path aliases (@ prefixed, defined in tsconfig.paths.json)
import type { AuthContext } from '@auth/interfaces'
import { IS_PUBLIC_KEY } from '@auth/decorators'
import { PrismaService } from '@prisma'

// Tier 5 — relative imports (./ or ../)
import { TokenService } from '../token.service'

// Tier 6 — side-effect imports (no bindings, run for their side effects)
import 'dotenv/config'
```

**Rules:**
- Skip a tier entirely if it has no imports — do not leave an empty blank line
- Side-effect imports (e.g. `import 'dotenv/config'`) are always Tier 6 (last), even if they must run first at runtime. `main.ts` is a known exception: `dotenv/config` must load env vars before modules are evaluated, so it stays at the top functionally — it is not moved to Tier 6 in that file.
- Use `import type` whenever only the type is needed (not the value at runtime)
- Within a tier: single-line imports first (sorted longest → shortest line), then multi-line imports (sorted longest → shortest)

## Barrel Exports (index.ts)

Each `index.ts` re-exports from sibling files. Exports are sorted by line length, longest first.

```ts
export { RedisTokenStore } from './redis-token.store'   // 53 chars — first
export { AuthController } from './auth.controller'      // 51 chars
export { TokenService } from './token.service'          // 47 chars
export { AuthService } from './auth.service'            // 44 chars
export { AuthModule } from './auth.module'              // 42 chars — last
```

**Rules:**
- One export per line — no grouping multiple modules into one export statement
- Use `export type` for interfaces and types
- No blank lines between exports within the same barrel
- Order by line length, longest → shortest

## Tech Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | Next.js, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod |
| Backend  | NestJS, TypeScript, PostgreSQL, Prisma ORM, Redis                       |
| Auth     | JWT + RBAC                                                              |
| DevOps   | Docker, GitHub Actions                                                  |
| Future   | Stripe, AWS, Terraform                                                  |
