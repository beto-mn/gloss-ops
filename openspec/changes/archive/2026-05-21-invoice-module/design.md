# Design: Invoice Module

## Context

GlossOps work orders already carry a `totalAmount` derived from billable items, and the `Invoice` Prisma model with full CFDI fields was present but unwired. This module adds the NestJS layer — repository interface, Prisma implementation, service, and controllers — following the established repository pattern. A new `InvoiceCounter` table enables per-branch sequential folio generation. No external PAC integration is included in this iteration; CFDI fields are stored but timbrado is a placeholder for a future `SatService`.

## Goals / Non-Goals

**Goals:**

- CRUD for invoices: create, list (paginated, filterable), get, update fiscal fields, transition status
- Per-branch folio generation (`INV-YYYY-NNNN`) using an atomic DB transaction on `InvoiceCounter`
- Status machine: DRAFT → ISSUED → PAID, DRAFT/ISSUED → CANCELLED; PAID and CANCELLED are terminal
- DRAFT → ISSUED guarded by work order COMPLETED check
- Fiscal data updates restricted to DRAFT status only
- `GET /work-orders/:workOrderId/invoice` sub-resource handled by `WorkOrderInvoiceController` inside `InvoicesModule`
- Activity log on creation and status transitions

**Non-Goals:**

- CFDI timbrado / PAC integration
- PDF generation or email delivery
- Payment recording or partial payment tracking
- Invoice series configuration per organization

## Decisions

- **`InvoicesModule` imports `WorkOrdersModule`, not the reverse** — the dependency is strictly one-directional to avoid circular imports. Work order ownership validation is delegated to `WorkOrdersService.findOne()`.
- **`WorkOrderInvoiceController` lives inside `InvoicesModule`** — placing the `GET /work-orders/:workOrderId/invoice` endpoint in `WorkOrdersController` would require `WorkOrdersModule` to import `InvoicesModule`, creating a cycle. Hosting it in `InvoicesModule` avoids this.
- **Folio generation via `$transaction` with upsert on `InvoiceCounter`** — a row-level lock on the counter row prevents duplicate folios under concurrent requests without requiring application-level locking or a separate sequence service.
- **Tax rate hardcoded at 16%** — Mexican IVA is fixed by law. The rate is a module-level constant rather than a configurable field to keep the current scope minimal; a future `TaxConfigService` can replace it.

## Risks / Trade-offs

- **`InvoiceCounter` upsert under high concurrency** — the upsert acquires a row-level lock, which serializes concurrent invoice creation for the same branch. This is acceptable for current shop volumes but may become a bottleneck at very high throughput.
- **CFDI fields stored without validation** — the API accepts any string for fields like `customerFiscalRegime` and `cfdiUse` without SAT catalog validation. This means invalid CFDI data can be stored, which will need to be enforced when PAC timbrado is added.
- **`totalAmount` used as-is from the work order** — the invoice subtotal equals the WO's `totalAmount` at creation time. If the WO items change after invoice creation (edge case), the invoice subtotal will not reflect those changes.
