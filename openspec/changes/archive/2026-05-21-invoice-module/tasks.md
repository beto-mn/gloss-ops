# Tasks: Invoice Module

## 1. Add `InvoiceCounter` to Prisma schema and migrate

- [x] 1.1 Add `InvoiceCounter` model to `schema.prisma` with `branchId` PK and `lastSeq` counter
- [x] 1.2 Add `invoiceCounter InvoiceCounter?` inverse relation to `Branch` model
- [x] 1.3 Run `prisma migrate dev --name add-invoice-counter`
- [x] 1.4 Confirm Prisma client regenerates with `prisma.invoiceCounter` available
- [x] 1.5 Commit schema and migration changes

## 2. Add path aliases

- [x] 2.1 Add `@invoices`, `@invoices/dto`, and `@invoices/interfaces` entries to `tsconfig.paths.json`
- [x] 2.2 Commit path alias changes

## 3. Create interfaces

- [x] 3.1 Create `interfaces/invoice.repository.interface.ts` with `InvoiceWorkOrderEmbed`, `InvoiceRecord`, `CreateInvoiceData`, `UpdateInvoiceData`, `InvoiceFilters`, `InvoicePage`, and `InvoiceRepositoryInterface`
- [x] 3.2 Create `interfaces/index.ts` barrel sorted by line length
- [x] 3.3 Commit interface files

## 4. Create token

- [x] 4.1 Create `invoices.tokens.ts` with `INVOICE_REPOSITORY` symbol
- [x] 4.2 Commit token file

## 5. Create in-memory repository

- [x] 5.1 Create `infrastructure/in-memory-invoice.repository.ts` with `seedWorkOrder` helper and all interface methods including paginated `findAll`
- [x] 5.2 Commit in-memory repository

## 6. Create DTOs

- [x] 6.1 Create `dto/create-invoice.dto.ts` with `workOrderId` and optional fiscal fields
- [x] 6.2 Create `dto/update-invoice.dto.ts` with all fiscal fields optional
- [x] 6.3 Create `dto/transition-invoice.dto.ts` with required `status` enum
- [x] 6.4 Create `dto/list-invoices.dto.ts` with optional `status`, `page`, and `limit`
- [x] 6.5 Create `dto/index.ts` barrel
- [x] 6.6 Commit DTO files

## 7. Write failing service tests

- [x] 7.1 Write full service spec covering create (5 cases), findAll, findOne (2 cases), findByWorkOrder (2 cases), update (2 cases), and transition (8 cases)
- [x] 7.2 Run tests to confirm they all fail

## 8. Implement InvoicesService

- [x] 8.1 Create `invoices.service.ts` with create, findAll, findOne, findByWorkOrder, update, and transition methods
- [x] 8.2 Implement `VALID_TRANSITIONS` map and 16% tax rate constant
- [x] 8.3 Run service tests to confirm all pass
- [x] 8.4 Commit service and spec files

## 9. Create Prisma repository

- [x] 9.1 Create `infrastructure/prisma-invoice.repository.ts` with folio generation via `$transaction` and `invoiceCounter` upsert
- [x] 9.2 Commit Prisma repository

## 10. Write failing controller tests

- [x] 10.1 Create `invoices.controller.spec.ts` testing delegation for create, findAll, findOne, update, and transition
- [x] 10.2 Create `work-order-invoice.controller.spec.ts` testing delegation for findByWorkOrder
- [x] 10.3 Run both specs to confirm they fail

## 11. Implement controllers

- [x] 11.1 Create `invoices.controller.ts` with POST, GET (list), GET (single), PATCH (update), PATCH (status) endpoints
- [x] 11.2 Create `work-order-invoice.controller.ts` with `GET /work-orders/:workOrderId/invoice`
- [x] 11.3 Run both controller specs to confirm all pass
- [x] 11.4 Commit controllers and specs

## 12. Create module and barrel

- [x] 12.1 Create `invoices.module.ts` importing `PrismaModule`, `WorkOrdersModule`, and `ActivityLogsModule`
- [x] 12.2 Create `index.ts` barrel exporting `InvoicesModule` and `InvoicesService`
- [x] 12.3 Commit module and barrel

## 13. Register in AppModule and verify

- [x] 13.1 Add `InvoicesModule` import and registration to `apps/api/src/app.module.ts`
- [x] 13.2 Run full API test suite to confirm no regressions and all invoice tests pass
- [x] 13.3 Build to verify TypeScript compiles without errors
- [x] 13.4 Commit AppModule changes
