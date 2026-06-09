# Architecture

## Project Overview

GlossOps is a **multi-tenant SaaS platform** for automotive wrap, detailing, and restyling shops. It replaces WhatsApp + spreadsheet workflows with a structured operational system covering customers, vehicles, work orders, and inventory.

## Monorepo Structure

```
glossops/
├── apps/
│   ├── web/        # Next.js (App Router)
│   └── api/        # NestJS
├── packages/
│   ├── database/   # Prisma schema, migrations, seed
│   └── shared/     # Shared types/DTOs
├── docker-compose.yml
└── .env.example
```

## Multi-Tenancy Model

Every resource is scoped to an **Organization** (the tenant) — all queries must filter by `organizationId`, or derive it via `branchId → branch.organizationId` for branch-scoped tables.

- `Account` is the login identity (the table is `account` because `USER` is a reserved word in PostgreSQL)
- An organization has one or more **peer Branches** — there is no `isMain` flag and no hierarchy
- The first branch is auto-created on org registration carrying the organization name
- An account joins a branch via `OrganizationMember`, which holds the `role` (`OWNER`, `MANAGER`, `TECHNICIAN`, `FRONT_DESK`)
- Invitations require an explicit `branchId` chosen by the inviter — never inferred

## Core Domain Entities

- `Organization` → tenant boundary, all data isolated here
- `Customer` → `CustomerAsset` (vehicles, motorcycles, boats, etc.) → `WorkOrder` → `WorkOrderItem` (linked to `Service`)
- `WorkOrder` → `InventoryUsage` → `InventoryItem` or `MaterialRoll`
- `Supplier` → supplies both `InventoryItem` and `MaterialRoll`
- `ActivityLog` → append-only audit trail of operational events

`MaterialRoll` (vinyl wrap, PPF, film) has domain fields like `brand`, `series`, `finish`, `width`, `remainingLength`, `lotNumber`. Both `InventoryItem` and `MaterialRoll` extend a base `Inventory` table via class table inheritance (1-to-1 FK on `id`).

## Auth & RBAC

- JWT access + Redis-backed refresh tokens
- Role-based access control with four roles: **Owner**, **Manager**, **Technician**, **Front Desk**
- Role is stored in `OrganizationMember.role`, not on the `Account` itself — an account can have different roles in different organizations

## Tech Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | Next.js, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod |
| Backend  | NestJS, TypeScript, PostgreSQL, Prisma ORM, Redis                       |
| Auth     | JWT + RBAC                                                              |
| DevOps   | Docker, GitHub Actions                                                  |
| Future   | Stripe, AWS, Terraform                                                  |

## Frontend Design System

- Source of truth: `design-system/glossops/MASTER.md` (Gulf Racing palette, light + dark tokens)
- Both light and dark themes are required; user toggle is available
- Primary CTA: `#F06432` (vivid orange) with white text
- Dark mode: background `#0F1C23` / card `#1A2730` / foreground `#B0CEE2`
- Light mode: background `#F5F8FA` / card `#FFFFFF` / foreground `#1A2730`
- Page-specific overrides: `design-system/glossops/pages/<page-name>.md` (takes precedence over MASTER)
