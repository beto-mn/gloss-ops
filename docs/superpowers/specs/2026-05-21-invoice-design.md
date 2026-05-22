# Invoice Module — Design Spec

**Date:** 2026-05-21  
**Branch:** feat/invoice  
**Scope:** Internal invoice CRUD + status transitions. No CFDI timbrado in this iteration (explicit placeholder for future PAC integration).

---

## Context

GlossOps work orders already carry a `totalAmount` derived from their billable items. The `Invoice` model is present in the Prisma schema with full CFDI fields. This module wires the NestJS layer: repository interface, Prisma implementation, service, and controller — following the established repository pattern used across all domain modules.

---

## Architecture

### Module structure

```
apps/api/src/invoices/
  interfaces/
    invoice.repository.interface.ts
    index.ts
  infrastructure/
    prisma-invoice.repository.ts
    in-memory-invoice.repository.ts
  dto/
    create-invoice.dto.ts
    update-invoice.dto.ts
    transition-invoice.dto.ts
    index.ts
  invoices.tokens.ts
  invoices.module.ts
  invoices.service.ts
  invoices.service.spec.ts
  invoices.controller.ts
  invoices.controller.spec.ts
  index.ts
```

### Database addition: `invoice_counter`

A new table tracks the per-branch folio sequence:

```prisma
model InvoiceCounter {
  branchId String @id @map("branch_id") @db.Uuid
  lastSeq  Int    @default(0) @map("last_seq")

  branch Branch @relation(fields: [branchId], references: [id])

  @@map("invoice_counter")
}
```

The `Branch` model gains a `invoiceCounter InvoiceCounter?` relation.

### Folio generation

Format: `INV-{YYYY}-{NNNN}` where `YYYY` is the calendar year at creation time (not the work order year) and `NNNN` is zero-padded to 4 digits, scoped per branch. The sequence counter is not reset annually — it grows monotonically per branch.

The Prisma repository increments the counter and inserts the invoice inside a single `$transaction`. The `UPDATE … SET last_seq = last_seq + 1` acquires a row-level lock, preventing duplicate folios under concurrent requests. If no counter row exists for the branch yet, one is upserted with `lastSeq = 1`.

The in-memory repository maintains a `Map<branchId, number>` as a local counter — sufficient for unit tests.

### Module dependencies

- `InvoicesModule` imports `WorkOrdersModule` to resolve work order ownership before creating an invoice.
- `WorkOrdersModule` does **not** import `InvoicesModule` — dependency is strictly one-directional.
- `InvoicesModule` imports `ActivityLogsModule` for audit trail.

---

## Repository Interface

```ts
interface InvoiceRepositoryInterface {
  create(data: CreateInvoiceData): Promise<InvoiceRecord>
  findById(id: string, branchId: string): Promise<InvoiceRecord | null>
  findByWorkOrder(workOrderId: string): Promise<InvoiceRecord | null>
  findAll(branchId: string, filters: InvoiceFilters): Promise<InvoicePage>
  update(
    id: string,
    branchId: string,
    data: UpdateInvoiceData
  ): Promise<InvoiceRecord>
  updateStatus(
    id: string,
    branchId: string,
    status: InvoiceStatus
  ): Promise<InvoiceRecord>
}
```

`InvoiceRecord` includes all scalar fields from the `Invoice` model plus an embedded `workOrder: { id, totalAmount, asset: { id, assetType, model, year } }`.

`InvoicePage` follows the project-standard shape: `{ data: InvoiceRecord[], total: number, page: number, limit: number }`.

---

## Business Logic

### Status machine

```
DRAFT ──► ISSUED ──► PAID
  │          │
  └──────────┴──► CANCELLED
```

Valid transitions:

| From        | To          | Extra rule                     |
| ----------- | ----------- | ------------------------------ |
| `DRAFT`     | `ISSUED`    | Work order must be `COMPLETED` |
| `DRAFT`     | `CANCELLED` | —                              |
| `ISSUED`    | `PAID`      | —                              |
| `ISSUED`    | `CANCELLED` | —                              |
| `PAID`      | —           | Terminal                       |
| `CANCELLED` | —           | Terminal                       |

When transitioning to `ISSUED`, `issuedAt` is set to the current timestamp.

### Service methods

| Method       | Signature                              | Description                                                                                                 |
| ------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `create`     | `(branchId, orgId, dto, accountId)`    | Verifies WO exists and belongs to branch; asserts no existing invoice; generates folio; creates in `DRAFT`. |
| `findAll`    | `(branchId, filters)`                  | Paginated list, filterable by `status`.                                                                     |
| `findOne`    | `(id, branchId)`                       | Returns `InvoiceRecord` with embedded `workOrder`.                                                          |
| `update`     | `(id, branchId, dto)`                  | Updates fiscal customer fields; only allowed in `DRAFT`.                                                    |
| `transition` | `(id, branchId, newStatus, accountId)` | Validates transition table and business rules; records activity log.                                        |

### CFDI placeholder

The CFDI fields (`cfdiUuid`, `cfdiXml`, `cfdiSealedAt`) are stored on the model but no PAC integration is implemented. The `transition DRAFT → ISSUED` flow does not call any external service. A future `SatService` / `CfdiService` will be injected into `InvoicesService` when timbrado is added.

---

## API Endpoints

### Invoices resource

```
POST   /branches/:branchId/invoices             create invoice
GET    /branches/:branchId/invoices             list invoices (paginated, filter by status)
GET    /branches/:branchId/invoices/:id         get invoice detail
PATCH  /branches/:branchId/invoices/:id         update fiscal data (DRAFT only)
PATCH  /branches/:branchId/invoices/:id/status  transition status
```

### Work order sub-resource (read-only, added to WorkOrdersController)

```
GET    /work-orders/:workOrderId/invoice        get invoice for a work order
```

This endpoint delegates to `InvoicesService.findByWorkOrder()`. No logic is added to `WorkOrdersService`.

### RBAC

| Operation                            | Roles                                          |
| ------------------------------------ | ---------------------------------------------- |
| Create, update, transition           | `OWNER`, `MANAGER`                             |
| Read (list, detail, WO sub-resource) | `OWNER`, `MANAGER`, `TECHNICIAN`, `FRONT_DESK` |

---

## DTOs

### `CreateInvoiceDto`

| Field                  | Type                             | Required |
| ---------------------- | -------------------------------- | -------- |
| `workOrderId`          | `string (UUID)`                  | Yes      |
| `customerTaxId`        | `string`                         | No       |
| `customerName`         | `string`                         | No       |
| `customerAddress`      | `string`                         | No       |
| `customerZipCode`      | `string`                         | No       |
| `customerFiscalRegime` | `string`                         | No       |
| `cfdiUse`              | `string`                         | No       |
| `paymentMethod`        | `CfdiPaymentMethod (PUE \| PPD)` | No       |
| `paymentForm`          | `string`                         | No       |

### `UpdateInvoiceDto`

Same fiscal fields as `CreateInvoiceDto`, all optional, no `workOrderId`.

### `TransitionInvoiceDto`

| Field    | Type            | Required |
| -------- | --------------- | -------- |
| `status` | `InvoiceStatus` | Yes      |

---

## Error Handling

| Situation                                     | Exception           | Error key                   |
| --------------------------------------------- | ------------------- | --------------------------- |
| Work order not found or not in branch         | `NotFoundException` | `work_order_not_found`      |
| Work order already has an invoice             | `ConflictException` | `invoice_already_exists`    |
| Invoice not found                             | `NotFoundException` | `invoice_not_found`         |
| Invalid status transition                     | `ConflictException` | `invalid_status_transition` |
| Issuing invoice with non-COMPLETED work order | `ConflictException` | `work_order_not_completed`  |
| Editing fiscal data outside DRAFT             | `ConflictException` | `invoice_not_editable`      |

---

## Testing

### `invoices.service.spec.ts`

Uses `InMemoryInvoiceRepository`. No Prisma mocks. Covered cases:

- Creates invoice successfully, folio formatted as `INV-YYYY-0001`
- Fails with `invoice_already_exists` when WO already has an invoice
- Fails with `work_order_not_found` when WO doesn't exist or belongs to a different branch
- `DRAFT → ISSUED` succeeds only when WO status is `COMPLETED`
- `DRAFT → ISSUED` fails with `work_order_not_completed` when WO is not `COMPLETED`
- All invalid transitions throw `invalid_status_transition`
- `update` throws `invoice_not_editable` when invoice is not in `DRAFT`
- `issuedAt` is populated when transitioning to `ISSUED`

### `invoices.controller.spec.ts`

Shallow spec verifying each endpoint delegates to the correct service method with the correct arguments. No business logic tested here.

---

## Out of Scope

- CFDI timbrado / PAC integration
- PDF generation
- Email delivery of invoices
- Payment recording (partial payments, Stripe)
- Invoice series configuration per organization
