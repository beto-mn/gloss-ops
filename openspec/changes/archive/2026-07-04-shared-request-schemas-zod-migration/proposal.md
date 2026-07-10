## Why

The request shape of every API endpoint is currently described **twice**: once in `apps/api` with class-validator DTOs (49 `.dto.ts` files across 16 modules) and again in `apps/web` with Zod form schemas (7 files under `src/lib/schemas/`). The two descriptions use different tools, live in different packages, and drift over time — a field added or a constraint tightened on one side is silently missed on the other. Feature 33 already established Zod as the single source of truth for **response** shapes in `@glossops/shared`; this change closes the loop by making Zod the single source of truth for **request** shapes too.

## What Changes

- Publish a Zod request schema (body, query, and route params as applicable) for every endpoint across all 16 API modules in a new `@glossops/shared/request-schemas` namespace — the single source of truth for request shapes.
- Introduce a `ZodValidationPipe` in `apps/api` and wire it as the global pipe in `main.ts`, replacing `ValidationPipe({ whitelist: true })`. Requests are validated (and coerced, e.g. pagination `page`/`limit`) against the shared Zod schemas. **BREAKING** at the code layer only — external request/response contracts are preserved.
- Delete all 49 class-validator DTOs under `apps/api/src/<module>/dto/`; controllers consume request types derived from the published schemas via `z.infer`.
- Delete the 7 web form schemas under `apps/web/src/lib/schemas/`; `apps/web` imports the same request schemas from `@glossops/shared` and derives form-value types via `z.infer`. Web-only refinements (e.g. `confirmPassword` match) are layered on top of the shared base schema.
- Preserve OpenAPI/Swagger metadata at `/api-docs` (via a chosen Zod→OpenAPI integration or an equivalent bridge — decided in design).
- Remove `class-validator` and `class-transformer` from `apps/api` dependencies.

## Capabilities

### New Capabilities

- `request-schemas`: `@glossops/shared` publishes a canonical Zod schema and inferred TypeScript type for every request payload (body/query/param) the API accepts, with naming and partial-update conventions; both `apps/api` (validation) and `apps/web` (form types) consume them.
- `zod-request-validation`: `apps/api` validates every incoming request through a global `ZodValidationPipe` against the published request schemas, coerces query params, preserves Swagger metadata, and no longer depends on class-validator/class-transformer.

### Modified Capabilities

<!-- No existing spec's requirements change; feature 22/33 shared-package and shared-schemas requirements remain valid and are extended, not modified. -->

## Impact

- **`packages/shared`**: new `src/request-schemas/` module + barrel exports; consumed by both apps.
- **`apps/api`**: new `ZodValidationPipe` (in `src/common`); `main.ts` global-pipe swap; all controllers retyped; 49 DTO files removed; Swagger bridge added; `class-validator` + `class-transformer` removed from `package.json`.
- **`apps/web`**: 7 `src/lib/schemas/*.schema.ts` files removed; forms import from `@glossops/shared`; `z.infer` form-value types.
- **Tests**: 54 unit suites + 17 e2e suites must stay green; e2e request bodies unchanged; new tests assert the pipe validates and coerces correctly.
- **Dependencies**: possible new dev/runtime dep for the Zod→OpenAPI bridge (design decision).
