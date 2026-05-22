# Proposal: Invoice Module

## Why

Work orders already tracked a `totalAmount` but there was no structured invoice layer. Shop owners needed to issue invoices with CFDI fiscal fields, track their lifecycle (DRAFT → ISSUED → PAID/CANCELLED), and enforce that an invoice can only be issued for a completed work order. The `Invoice` model existed in Prisma but had no NestJS service, controller, or folio generation logic.

## What Changes

- New `InvoicesModule` with full CRUD and status transition endpoints under `/invoices` (branch-scoped via auth context)
- Per-branch sequential folio generation (`INV-YYYY-NNNN`) via a new `InvoiceCounter` table with atomic upsert
- Status machine enforcing valid transitions: DRAFT → ISSUED → PAID, DRAFT/ISSUED → CANCELLED
- `GET /work-orders/:workOrderId/invoice` sub-resource endpoint for work order invoice lookup
- Fiscal CFDI fields stored on the invoice; no PAC timbrado in this iteration
- Activity log on invoice creation and status transitions

## Capabilities

- `invoice-module`: Create, read, update, and transition invoices with per-branch folio sequences and work-order ownership validation

## Impact

- `packages/database/prisma/schema.prisma` — added `InvoiceCounter` model and `Branch.invoiceCounter` relation
- `packages/database/prisma/migrations/` — new migration for `invoice_counter` table
- `apps/api/src/invoices/` — new module (interface, in-memory repo, Prisma repo, DTOs, service, two controllers, module, barrel)
- `apps/api/src/app.module.ts` — registered `InvoicesModule`
- `apps/api/tsconfig.paths.json` — added `@invoices` path aliases
