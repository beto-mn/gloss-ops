# Design: Customers Module

## Context

GlossOps needs to record the clients of each automotive shop. Customer records are the root of the operational hierarchy — work orders, vehicles, and services all trace back to a customer. Each customer belongs to exactly one organization, and email/phone must be unique within that organization to avoid duplicate entries.

## Goals

- Full CRUD for tenant-scoped customers with text search and pagination
- Email and phone uniqueness enforced at the service layer per organization
- Fiscal data (`taxId`, `fiscalRegime`, `zipCode`) stored as a flat block on the customer record
- Repository pattern: interface, in-memory implementation, Prisma implementation, DI token

## Non-Goals

- Customer asset (vehicle) management (separate module)
- Bulk import or export of customers
- Customer-level audit logging (handled by ActivityLog in a future module)
- Soft deletes (hard delete only for MVP)

## Decisions

| Decision                        | Choice                                                               | Reason                                                                                    |
| ------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Uniqueness enforcement location | Service layer via findByEmail/findByPhone                            | Avoids DB-level unique constraint errors that are harder to map to structured error codes |
| Fiscal data                     | Flat fields on Customer                                              | No separate fiscal profile table needed at MVP scale                                      |
| Search implementation           | DB-level case-insensitive match on concatenated name + email + phone | Sufficient for MVP; full-text search index can replace it if query latency grows          |
| Pagination                      | page/limit query params with CustomerPage meta                       | Consistent with the pattern used across other list endpoints                              |

## Risks / Trade-offs

- Service-layer uniqueness checks have a race condition window — two concurrent requests with the same email could both pass the check before either inserts. At MVP scale this is acceptable; a unique DB index can enforce the guarantee at the data layer later
- Text search via SQL `ILIKE` on concatenated fields is not indexed — acceptable for small customer lists; a search index or Postgres `tsvector` is the future path
