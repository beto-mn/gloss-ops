# Design: Work Orders Module

## Context

The work orders module is the central operational entity of the platform — the point where customers, vehicles, services, inventory, and technicians converge. All other catalog modules (services, brands, suppliers) feed into work orders. The schema already contained all required models (`WorkOrder`, `WorkOrderItem`, `WorkOrderAssignment`, `AssetCheckpoint`) with no migration needed. AWS S3 integration was added for checkpoint photo and signature upload via pre-signed URLs.

The module covers four resources within a single `WorkOrdersModule`. Org-scoping is done via `branchId → branch.organizationId` because work orders belong to a branch, not directly to an organization.

## Goals

- Full CRUD for work orders with status state machine enforcement
- Nested work order items with automatic `totalAmount` recalculation after every mutation
- Member assignments with org-membership validation and duplicate prevention
- Asset checkpoints (RECEPTION/DELIVERY) with photo/signature upload via S3 pre-signed URLs
- Four controllers splitting concerns: work orders, items, assignments, checkpoints
- Single `WorkOrdersService` orchestrating all four repository interfaces
- `branchId` always sourced from `account.branchId`, never from request body

## Non-Goals

- Invoice generation (`InvoicesModule`)
- Inventory usage tracking (`InventoryUsage`)
- Warranty auto-generation (`WarrantyModule`)
- Push notifications
- PDF generation
- `ActivityLog` integration
- Validation that `assetId` belongs to the org of the branch

## Decisions

**Single service, four controllers.** One `WorkOrdersService` is injected into four controllers that split the API surface by resource. This keeps routing clear (nested paths under `/work-orders/:id/`) while avoiding the overhead of four separate NestJS modules.

**`syncTotal` as private method.** After every item add, update, or remove, the service calls `syncTotal` which fetches all current items and recomputes `totalAmount`. This is simpler and more correct than tracking deltas, at the cost of one extra DB read per item mutation.

**S3 pre-signed URL pattern.** The frontend calls the presign endpoint to get a short-lived PUT URL, uploads the binary directly to S3 without proxying through the API, then PATCHes the checkpoint with the resulting file URL. This avoids large binary payloads going through the NestJS process.

**In-memory repos use callbacks for cross-repo joins.** `InMemoryWorkOrderRepository.setItemsGetter` accepts a function that fetches items by work order ID, allowing `findById` to return `WorkOrderWithDetails` without a direct dependency between the two in-memory repos.

## Risks / Trade-offs

- `totalAmount` recalculation reads all items on every mutation — this is acceptable for typical work order sizes (< 20 items) but would degrade at scale. A delta-based approach or a DB-level computed column would be needed for high-throughput scenarios.
- The S3 pre-signed URL expires in 5 minutes. If the frontend takes longer to upload, the PUT will fail. The app has no mechanism to detect or recover from a failed upload — the checkpoint's photo array simply won't be updated.
- `WorkOrdersModule` does not validate that `assetId` belongs to the organization — this is explicitly out of scope and deferred.
