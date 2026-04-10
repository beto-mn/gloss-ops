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

## Tech Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | Next.js, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod |
| Backend  | NestJS, TypeScript, PostgreSQL, Prisma ORM, Redis                       |
| Auth     | JWT + RBAC                                                              |
| DevOps   | Docker, GitHub Actions                                                  |
| Future   | Stripe, AWS, Terraform                                                  |
