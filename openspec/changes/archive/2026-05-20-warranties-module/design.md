# Design: Warranties Module

## Context

The `Warranty` model already existed in the Prisma schema. Work orders carried `warrantyDays` on service items, but no NestJS layer existed to consume it. Technicians completing a job had no automated way to issue warranties, and warranty-claim work orders could reference any warranty ID without validation. This module adds the full service/repository layer and integrates it bidirectionally with the work orders flow.

## Goals / Non-Goals

**Goals:**

- Auto-generate warranty records when a WO transitions to COMPLETED (one per qualifying service item)
- Expose `GET /work-orders/:workOrderId/warranties`, `GET /customer-assets/:assetId/warranties`, `GET /warranties/:id`, and `POST /warranties/:id/void`
- Validate WARRANTY_CLAIM references in `WorkOrdersService.create()` before persisting the WO
- Record an activity log entry when a warranty is voided
- Export `WarrantyService` from `WarrantiesModule` for use by `WorkOrdersModule`

**Non-Goals:**

- Schema migration (the `Warranty` model already exists)
- Activity log on warranty generation (WO completion already logs `STATUS_CHANGED`)
- Pagination on warranty list endpoints (a WO generates at most one warranty per item; asset history rarely exceeds 20 records)

## Decisions

- **`WarrantiesModule` does not import `WorkOrdersModule`** — to avoid a circular dependency (`WorkOrdersModule` imports `WarrantiesModule`), the warranty repository owns all cross-table joins needed for org-scoping and claim validation, rather than delegating WO lookups to `WorkOrdersService`
- **`completedAt` is passed as a parameter to `generateForWorkOrder`** — the timestamp is already computed in `WorkOrdersService.updateStatus()` and is passed directly to avoid an additional DB query
- **`branchId` is resolved via join inside `WarrantyRecord`** — the warranty itself has no `branchId` column; the repository resolves it through `workOrderItem → workOrder → branchId` and surfaces it in the record shape so the service can log it without a second query

## Risks / Trade-offs

- **Repository cross-table joins** — the warranty repository performs joins across `workOrderItem`, `workOrder`, and `branch` for every read. This is intentional to avoid circular module dependencies but means more complex queries compared to a simpler flat model.
- **No pagination** — list endpoints return all results. If a high-volume shop accumulates many warranty-claim work orders for a single asset, response size may grow over time. The decision was deferred because the use case is rare in the current target market.
