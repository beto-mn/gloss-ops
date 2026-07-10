# Review — shared-request-schemas-zod-migration

## Verdict: APPROVE WITH NOTES

All binding requirements from both spec deltas are met, all 34 tasks are `[x]`, `./init.sh`
exits 0 (API 70/688), and the flagged invoice divergence is genuinely closed. Two documented
interpretation deviations (thin `createZodDto` DTO wrappers; web `*.schema.ts` retained for
response/domain types via composition) are acceptable per design D1 and the spec's explicit
"MAY compose" language. One MINOR gap: the `@IsDateString`→`z.string().datetime()` tightening
has no explicit date-only-rejection unit assertion (the tightening and the web widen-to-ISO
compensation are both present and correct, but the regression guard is implicit).

## Traceability (requirement → met? → evidence)

| Requirement                                                                                   | Met | Evidence                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| request-schemas: published for every endpoint, `request-schemas/` namespace, barrel re-export | YES | packages/shared/src/request-schemas/{customer,work-order,invoice,pagination}.ts; APPLY_LOG groups 1-2 (16 modules, 37 schemas documented)                                            |
| Naming + `.partial()` update convention                                                       | YES | customer.ts:27 `UpdateCustomerSchema = CreateCustomerSchema.partial()`; invoice.ts:44 `.omit({workOrderId}).partial()`; genuine `.nullable()` cases documented (work-order.ts:56-59) |
| Body transform-free; query coerces                                                            | YES | customer.ts:10-21 plain object; pagination.ts:11-14 `z.coerce.number().int().min(1)`; test customer-request-schemas.spec.ts:52-53 coerces `'2'/'50'`                                 |
| Shared schemas pure (no NestJS/@glossops/database)                                            | YES | customer.ts / work-order.ts / invoice.ts import only `zod` + local `./pagination`; Prisma enums re-declared as `z.enum` literals                                                     |
| Web forms consume shared; no duplicated request shape                                         | YES | grep: zero `z.object` in apps/web/src/lib/schemas/\*.schema.ts; all import from @glossops/shared (extend/omit/partial)                                                               |
| Global ZodValidationPipe wired, replaces ValidationPipe                                       | YES | main.ts:99 `new ZodValidationPipe()`; HybridValidationPipe file deleted; common/index.ts exports only the exception filter                                                           |
| Unknown keys stripped (whitelist parity)                                                      | YES | work-order-request-schemas.spec.ts:24-30 `strips unknown keys`                                                                                                                       |
| Invalid request → 400                                                                         | YES | ZodValidationExceptionFilter wired main.ts:100; e2e 17/97 green                                                                                                                      |
| OpenAPI preserved via cleanupOpenApiDoc                                                       | YES | main.ts:4,109 `cleanupOpenApiDoc(SwaggerModule.createDocument(...))`; APPLY_LOG 4.4 spot-check 37 schemas                                                                            |
| @ApiProperty removed from request DTOs                                                        | YES | grep: only hit is auth/dto/token-response.dto.ts (RESPONSE DTO, accepted)                                                                                                            |
| class-validator/class-transformer removed                                                     | YES | grep: zero imports under apps/api/src; none in apps/api/package.json (transitive-only in lockfile, expected)                                                                         |
| Existing behavior + suites preserved                                                          | YES | init.sh EXIT 0; API 70/688, e2e 17/97, web 20 files/81 tests                                                                                                                         |

## Feature 35 acceptance walkthrough

1. ZodValidationPipe global in main.ts replacing ValidationPipe — MET (main.ts:99).
2. Every body/query/param validated via shared Zod schema — MET (16 modules migrated).
3. 49 class-validator DTOs deleted / Zod in @glossops/shared — MET-with-deviation: validation
   logic relocated to shared; dto/ files collapsed to one-line `createZodDto` wrappers (design D1,
   inherent to nestjs-zod). ACCEPTABLE.
4. 7 web form schemas deleted / imports from shared via z.infer — MET-with-deviation: files
   retained as thin composition layers holding out-of-scope response/domain types; no file
   redefines a shared request shape (grep: zero z.object). ACCEPTABLE per spec "MAY compose".
5. PATCH via .partial() where applicable — MET (customer, invoice, brand, service, etc.);
   genuine null-clearing updates use documented `.nullable().optional()`.
6. OpenAPI preserved — MET (cleanupOpenApiDoc).
7. Unit tests pass — MET (688, exceeds baseline).
8. e2e pass — MET (17/97).
9. web typecheck green + form behavior preserved — MET (only 3 pre-existing api-client.test.ts
   errors, confirmed pre-existing).
10. api + web lint pass — MET (APPLY_LOG group 4.5).
11. class-validator/class-transformer removed from apps/api deps — MET.

## Findings

### CRITICAL (0)

None.

### MAJOR (0)

None.

### MINOR (2)

- M1: No explicit unit assertion that `z.string().datetime()` REJECTS a date-only string
  (e.g. `'2026-07-04'`) for `scheduledAt` (work-orders) / `expectedAt` (purchase-orders). The
  tightening is applied (work-order.ts:44,57) and the web compensates
  (work-orders/new/page.tsx:179, work-order-edit-drawer.tsx:69 widen to ISO), but the
  behavior-change regression guard is implicit. Existing valid-parse tests omit the date field.
- M2: Pre-existing `/work-orders/new` next-build suspense error and 3 pre-existing
  api-client.test.ts tsc `unknown` errors remain (confirmed pre-existing on master, out of
  scope). Noted only for completeness; not attributable to this change.

## Accepted (not raised)

- Thin `createZodDto` DTO wrapper files (design D1).
- Web `*.schema.ts` retained for response/domain types + composition (spec "MAY compose").
- token-response.dto.ts keeping @ApiProperty (response DTO, out of scope).
- Lockfile transitive class-validator/class-transformer (optional NestJS peer deps).
