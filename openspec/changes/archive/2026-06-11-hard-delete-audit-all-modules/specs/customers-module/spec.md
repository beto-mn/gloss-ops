## ADDED Requirements

### Requirement: Customer deletion is soft-delete only

`DELETE /customers/:id` SHALL only soft-delete the customer (`status=DELETED`). The `permanent` query parameter — if present in a request — has no effect and is silently stripped by the validation pipe. Customer records are referenced by `Invoice` (and transitively by `WorkOrder` → `Invoice`); fiscal retention requirements in most jurisdictions prohibit removing customer records that have invoices.

The `removeCustomer` service method SHALL NOT call `prisma.customer.delete(...)`.

#### Scenario: Soft-delete returns 204 and marks the customer

- **WHEN** an `OWNER` or `MANAGER` calls `DELETE /customers/:id` against an existing active customer
- **THEN** the customer's `status` is set to `DELETED` and the response is `204`

#### Scenario: `permanent=true` is silently ignored

- **WHEN** an authorized caller calls `DELETE /customers/:id?permanent=true`
- **THEN** the response is identical to the request without the flag — the customer is soft-deleted, NOT hard-deleted, and no child rows (assets, work orders, invoices) are removed

#### Scenario: Genuine not-found returns 404

- **WHEN** `DELETE /customers/:id` is invoked with an id that does not exist for the caller's org
- **THEN** the response is `404 Not Found` with `{ error: 'customer_not_found' }`

#### Scenario: removeCustomer never calls prisma.customer.delete

- **WHEN** the service-layer code is inspected
- **THEN** no code path in `CustomersService.removeCustomer` calls `prisma.customer.delete(...)` — only the soft-delete repository method is used
