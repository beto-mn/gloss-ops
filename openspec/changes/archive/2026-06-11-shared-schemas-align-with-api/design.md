## Context

`packages/shared` already exports Zod schemas for the 14 resource shapes plus enums and a pagination DTO. The schemas were authored ahead of the actual API responses, and as the controllers landed they drifted — sometimes because a field was removed (`folio` on `WorkOrder` only exists on `Invoice`), sometimes because the schema was modeled on a planned future shape (the discriminated union in `InventoryItemSchema`), and sometimes because the API serializes a Prisma `Decimal` differently than the schema expected.

The e2e suites delivered in `testing-integration-api` exposed every gap and worked around each one with `// no shared schema yet — TODO …` comments and local `interface` definitions. That state is acceptable for landing the harness but fundamentally hides drift from future regressions — a real API change that breaks `apps/web` would slip past every e2e because the inline assertions only check the fields the suite happens to read.

This change closes every drift point. The user has decided:

1. The **API is the source of truth** — we adapt `@glossops/shared` to match what the controllers return today; no `src/` changes.
2. **Decimal serialization** in the schemas reads as `number` to TypeScript consumers (regardless of how the API serializes it on the wire).
3. **Pagination** is expressed via a single generic factory rather than per-entity duplicate definitions.
4. **The e2e suites are cleaned up** — every `// no shared schema yet` workaround disappears.

## Goals / Non-Goals

**Goals:**

- Every published schema in `@glossops/shared` parses every successful response from the corresponding `apps/api` endpoint without throwing.
- Every `// no shared schema yet` comment in `apps/api/test/*.e2e-spec.ts` is removed.
- Every local `interface ...Response` defined inside an e2e spec file is removed; the response is parsed through `parseWith(<published schema>)` instead.
- A single generic page-schema factory is published and used by every paginated list endpoint's schema.
- Decimal fields are typed as `number` to TypeScript consumers even when the API serializes them as string.
- `apps/web` imports continue to work without changes — types narrow correctly under the new shapes.

**Non-Goals:**

- Modifying any controller, service, repository, or Prisma schema in `apps/api/src/`. If a drift can only be resolved with an API change (e.g., a field that genuinely should exist), it is filed as a separate follow-up — not fixed here.
- Renaming existing schemas. We only modify shapes and add new ones.
- Adding runtime validation to `apps/web` (separate concern).
- Backwards compatibility shims. The new schemas replace the old ones in place; consumers move.
- Documenting every field's domain meaning — schemas describe shape, not semantics.

## Decisions

### D1: API is the source of truth; no `apps/api/src/` changes

If the API and the schema disagree, the schema is wrong. This is the user's explicit choice and it has the cheapest blast radius — the only code that breaks under a schema-only change is anything currently building against the _old_ schema, which is exactly what we want this change to catch and update. The two cases where the disagreement looks like an API bug (e.g., `Customer.activeWorkOrderCount` missing on detail; `DELETE /organizations/me?permanent=true` FK semantics) are tracked in `feature_list.json` as their own follow-up features and are explicitly out of scope here.

**Alternative considered:** treat the schema as the design contract and fix the API. Rejected — bigger blast radius, requires controller/service/Prisma edits, and the apps/web layer is already coding against what the API actually returns.

### D2: Decimal fields use `z.coerce.number()`

Prisma's `Decimal.toJSON()` returns a string by default, so a vanilla `z.number()` schema rejects the actual API payload. Three options were on the table:

- `z.number()` and force the API to convert — rejected, breaks D1.
- `z.string()` and parse downstream — rejected, every `apps/web` consumer would have to call `Number(value)` before math; the user picked "number".
- `z.coerce.number()` — accepts both string and number at parse time, hands `number` to TypeScript. The runtime is tolerant of the actual API output (any of: real number, Decimal serialized as string, scientific notation); the type contract is consistent.

We picked `z.coerce.number()`. It satisfies "API is truth" (no controller change) and "schema is number-typed" (apps/web consumers get `number`) simultaneously.

**Where it applies:** `subtotal`, `tax`, `taxRate`, `taxAmount`, `total`, `unitPrice`, `quantity` when it represents a partial roll quantity, and every Decimal field on `Inventory`, `Invoice`, `PurchaseOrder`, `WorkOrderItem`.

### D3: Generic page schema factory

`packages/shared/src/schemas/pagination.ts` will export:

```ts
export const createPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  })
```

Each paginated entity then publishes its `Page` schema as `export const CustomerPageSchema = createPageSchema(CustomerListItemSchema)` etc. This keeps every paginated wrapper in lock-step — adding a field (e.g., `pageCount`) flips one place and propagates.

**Alternative considered:** per-entity hand-written page schemas. Rejected — duplicates four fields across six entities and drifts the moment one is forgotten.

### D4: Schema shape per endpoint variant, not per entity

For most entities the API returns the same shape for `GET /thing/:id`, `POST /thing`, and `PATCH /thing/:id`. For a few (`Customer`, `WorkOrder`, `WorkOrderAssignment`), the list/detail/create variants differ enough that a single schema can't cover them. Pattern:

- `<Entity>ListItemSchema` for entries in `data: T[]` lists.
- `<Entity>DetailSchema` for `GET /thing/:id`.
- `<Entity>CreateResponseSchema` when `POST /thing` returns something narrower than detail (e.g., `Customer` create has no `activeWorkOrderCount` because nothing exists yet).
- `<Entity>Schema` is kept as an alias for the detail shape where it already exists, to preserve `apps/web` imports.

**Alternative considered:** one fat schema with optional fields. Rejected — destroys the discrimination that makes `parseWith` useful.

### D5: New schemas live in new files, modifications happen in place

- `auth.ts`, `pagination.ts`, `inventory-usage.ts`, `work-order-assignment.ts` are new files.
- `work-order.ts`, `customer.ts`, `asset-checkpoint.ts`, `invoice.ts`, `inventory.ts`, `purchase-order.ts`, `organization.ts` are edited in place.
- The barrel `packages/shared/src/index.ts` is updated and re-sorted (longest → shortest line per project conventions).

### D6: Sweep is verified, not just enforced

After the migration, a grep gate runs as part of the verification step: `grep -r "no shared schema yet" apps/api/test/` must return zero matches and `grep -r "interface.*Response" apps/api/test/*.e2e-spec.ts` must return zero matches. This is part of `tasks.md` cross-cutting checks.

### D7: `Decimal.toJSON()` behavior is tested, not assumed

Inside the e2e migration, at least one assertion per Decimal-bearing entity (Invoice line item, PurchaseOrder line item, Inventory roll) explicitly verifies the parsed value is a JavaScript `number` after `parseWith(...)` runs — i.e., we don't just assert the schema _passes_, we assert the runtime _output_ is a real number. This catches the case where `z.coerce.number()` silently coerces a malformed string.

## Risks / Trade-offs

- **[Risk]** `z.coerce.number()` silently turns `"abc"` into `NaN` rather than throwing. → **Mitigation:** D7 above. Plus, the entities in question always produce Prisma-serialized values, never freeform user input.
- **[Risk]** `apps/web` was relying on the OLD shape of a schema (e.g., reading `folio` from a `WorkOrder`). → **Mitigation:** TypeScript catches this at `pnpm --filter web typecheck`, which is part of the verification step. The blast radius is small — `apps/web` builds today against what the API actually returns, not what the schema declared.
- **[Risk]** A future API change re-introduces drift and the schemas go stale again. → **Mitigation:** With every e2e suite now running through `parseWith(<schema>)` with zero workaround comments, any new drift breaks the corresponding e2e immediately. That's the long-term value of this change.
- **[Trade-off]** `z.coerce.number()` is tolerant by design — it accepts more inputs than `z.number()`. We accept that tolerance because the producer (Prisma serialization) is a known, narrow source.
- **[Trade-off]** Multiple schema variants per entity (List/Detail/CreateResponse) is more surface than a single fat schema. We accept the extra surface for the discrimination it gives at `parseWith` time.

## Migration Plan

1. Add `pagination.ts` with `createPageSchema` factory.
2. Add `auth.ts` (`AuthTokensSchema`).
3. Edit each affected entity schema file to align with the API payload (using D2 for Decimal fields).
4. Add new files: `inventory-usage.ts`, `work-order-assignment.ts`.
5. Extend `organization.ts` with `OrganizationWithRoleSchema`, `MemberWithAccountSchema`, `InvitationCreatedSchema`.
6. Update the barrel `index.ts` (longest → shortest sort).
7. Run `pnpm --filter shared build` (or whatever the shared package's check step is) — must pass.
8. Migrate every e2e spec file in `apps/api/test/`: replace every local `interface ...Response` and inline `expect.objectContaining(...)` block with `parseWith(<NewSchema>)`. Delete every `// no shared schema yet` comment.
9. Verification gates (D6, D7): grep for residual workarounds; assert Decimal fields are `number` at runtime.
10. `pnpm --filter api test:e2e` → green. `pnpm --filter api test` → still 601 tests green. `pnpm --filter web typecheck` → green. `./init.sh` → green.

**Rollback:** revert the git changes. The shared package is internally version-pinned within the monorepo so no published-package coordination is required.

## Open Questions

- None blocking. The two real-bug findings from the testing-integration-api review (FK cascade on Organization, `activeWorkOrderCount` on Customer detail) are tracked as their own `pending` features in `feature_list.json` and are explicitly out of scope here.
