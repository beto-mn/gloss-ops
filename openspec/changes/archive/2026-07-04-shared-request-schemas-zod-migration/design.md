## Context

Request shapes are described twice today: 49 class-validator DTOs in `apps/api/src/*/dto/` and 7 Zod form schemas in `apps/web/src/lib/schemas/`. Feature 33 already made Zod the single source of truth for **responses** in `@glossops/shared`. This change does the same for **requests**, using [`nestjs-zod`](https://github.com/benlorantfy/nestjs-zod) as the validation + OpenAPI bridge (chosen at the proposal gate over a hand-rolled pipe).

Ground truth (see `RESEARCH.md` in this change dir):

- `main.ts:98` registers `new ValidationPipe({ whitelist: true })`; Swagger is built at `main.ts:100–111` via `SwaggerModule` reading `@nestjs/swagger` decorators.
- Pagination DTOs coerce query strings with class-transformer `@Type(() => Number)`.
- `PartialType` is used for update DTOs.
- Zod versions are skewed: `apps/web` `^3.25.76`, but `apps/api` and `packages/shared` `^3.24.2`.

## Goals / Non-Goals

**Goals**

- One Zod schema per request payload (body/query/param), published from `@glossops/shared`, consumed by both apps.
- Global `ZodValidationPipe` in `apps/api` replacing the class-validator `ValidationPipe`.
- Swagger at `/api-docs` preserves per-endpoint request schemas.
- `class-validator` + `class-transformer` removed from `apps/api`.
- Web forms derive value types from the shared schemas via `z.infer`.

**Non-Goals**

- No change to **response** serialization. `ZodSerializerInterceptor` is out of scope — responses stay as-is (feat 33 governs them at the test layer). This keeps the blast radius on the request path only.
- No change to any external request/response contract, folio logic, RBAC, or business rules.
- No new endpoints; no Prisma/schema changes.

## Decisions

### D1 — nestjs-zod as the bridge; `createZodDto` wrappers stay in `apps/api`

`@glossops/shared` exports **pure Zod schemas only** — it must not depend on NestJS. Each endpoint gets a thin wrapper in `apps/api/src/<module>/dto/`:

```ts
// apps/api/src/customers/dto/create-customer.dto.ts
import { createZodDto } from 'nestjs-zod'
import { CreateCustomerSchema } from '@glossops/shared'

export class CreateCustomerDto extends createZodDto(CreateCustomerSchema) {}
```

Controllers keep their `@Body()/@Query()/@Param()` signatures unchanged. The wrapper class is required so `@nestjs/swagger` can read the schema for OpenAPI and so the type flows to the controller.

**Interpretation of the acceptance criteria:** "delete all 49 class-validator DTOs" means the class-validator/class-transformer _validation logic_ is deleted and relocated to `@glossops/shared`. The `dto/` folders remain but each file collapses to a one-line `createZodDto` wrapper. No file contains a `class-validator` or `class-transformer` import after this change. This deviation from a literal "zero DTO files" reading is inherent to the nestjs-zod approach chosen at the gate and is called out here so the reviewer does not flag it.

### D2 — shared package layout: `request-schemas/` namespace

Mirror the existing `schemas/` (responses) structure:

```
packages/shared/src/request-schemas/
├── auth.ts            # LoginSchema, RegisterSchema, RefreshSchema, ...
├── customer.ts        # CreateCustomerSchema, UpdateCustomerSchema, ListCustomersQuerySchema
├── ...                # one file per module (16 modules)
└── index.ts           # barrel, sorted longest → shortest line
```

Add `export * from './request-schemas'` to `packages/shared/src/index.ts`. Naming convention: `Create<Entity>Schema`, `Update<Entity>Schema`, `List<Entity>QuerySchema`. Update schemas use `.partial()` on the create schema: `export const UpdateCustomerSchema = CreateCustomerSchema.partial()` — the Zod equivalent of `PartialType`.

### D3 — body vs query schema split (coercion)

- **Body schemas** are plain `z.object({...})` with no transforms. Their input and output types match, so `apps/web` can reuse them directly for form values.
- **Query schemas** replace `@Type(() => Number)` with `z.coerce.number().int().min(1)` etc., because query params arrive as strings. Query schemas are effectively API-only; the web does not reuse them.

This split keeps body schemas clean for `z.infer`-derived form types while letting query validation coerce.

### D4 — global pipe wiring in `main.ts`

Replace `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))` with `app.useGlobalPipes(new ZodValidationPipe())`. `whitelist` behavior (stripping unknown keys) is achieved with `.strip()` semantics — default Zod object parsing already strips unknown keys, matching current behavior.

### D5 — Swagger preserved via `cleanupOpenApiDoc`

Wrap the generated document: `SwaggerModule.setup('api-docs', app, cleanupOpenApiDoc(document))`. `createZodDto` classes expose the OpenAPI schema; `cleanupOpenApiDoc` (current nestjs-zod API, replacing the deprecated `patchNestJsSwagger()`) finalizes the document. `@ApiProperty`/`@ApiPropertyOptional` decorators are removed from DTOs; `@ApiOperation`/`@ApiTags`/`@ApiBearerAuth` on controllers stay.

### D6 — validation error shape

nestjs-zod throws `ZodValidationException` → HTTP 400. The existing e2e test only asserts `.expect(400)` (no body-shape assertion), so it passes as-is. To keep the response body compatible for `apps/web` error handling, add a `ZodValidationExceptionFilter` in `apps/api/src/common` that maps issues to a `{ statusCode, message, errors: [{ path, message }] }` shape. Verify against the web error handler during apply.

### D7 — zod version alignment

Bump `apps/api` and `packages/shared` from `zod ^3.24.2` to `^3.25.76` (matching `apps/web`). Satisfies nestjs-zod's `zod ^3.25.0 || ^4.0.0` peer requirement and removes the existing skew. Stays within Zod v3 — no v4 migration.

## Risks / Trade-offs

- **Behavioral parity of validation.** class-validator and Zod differ on edge cases (empty strings, coercion, extra keys). Mitigation: e2e suites (17) exercise real payloads; run them after each module migrates. The `whitelist`→strip mapping (D4) is the main parity point to watch.
- **Web form refinements.** Some web schemas add cross-field refinements (e.g. `registerSchema.confirmPassword`) and `.or(z.literal(''))` for optional strings. These are UI concerns layered on top of the shared base schema in `apps/web`, not pushed into `@glossops/shared`. Web keeps a thin composition layer, not a duplicate schema.
- **Swagger fidelity.** Auto-generated OpenAPI from Zod may differ cosmetically (examples, descriptions) from the current hand-authored `@ApiProperty` examples. Acceptable; `/api-docs` must still document every endpoint's request schema.
- **Migration size.** 16 modules × (create/update/list) is large. Mitigation: migrate module-by-module (tasks.md), keeping tests green between modules; the pipe can coexist because each controller opts in via its DTO type.

## Migration Plan

1. Add `nestjs-zod` dep + bump zod; publish `request-schemas/` for a pilot module (customers) end-to-end (schema → DTO wrapper → controller → Swagger → tests green).
2. Roll out remaining 15 modules, one per task group, keeping `pnpm --filter api test` + `test:e2e` green.
3. Swap `apps/web` forms to shared schemas, delete `src/lib/schemas/`, keep web typecheck + unit tests green.
4. Remove `class-validator`/`class-transformer`; final full `./init.sh`.

## Open Questions

- None blocking. The exact `ZodValidationExceptionFilter` body shape (D6) will be finalized against the web error handler during apply.
