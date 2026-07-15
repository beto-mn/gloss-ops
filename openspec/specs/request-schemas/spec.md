# request-schemas Specification

## Purpose

TBD - created by archiving change shared-request-schemas-zod-migration. Update Purpose after archive.

## Requirements

### Requirement: Request schemas published for every endpoint

`@glossops/shared` SHALL export a Zod request schema and its inferred TypeScript type for every request payload accepted by `apps/api` — request bodies, query strings, and route params where validation applies — across all 16 modules. Each schema MUST parse a valid payload without throwing and MUST reject an invalid payload with a `ZodError`.

The schemas SHALL live under a `request-schemas/` namespace, parallel to the existing response `schemas/` namespace, and SHALL be re-exported from the package root barrel so both `apps/api` and `apps/web` can import them from `@glossops/shared`.

#### Scenario: Schema parses a valid request body

- **WHEN** a valid create/update payload for any module is parsed with its published request schema
- **THEN** `schema.parse(payload)` returns without throwing and yields a value typed via `z.infer<typeof Schema>`

#### Scenario: Schema rejects an invalid request body

- **WHEN** a payload missing a required field or with a wrong-typed field is parsed
- **THEN** `schema.parse(payload)` throws a `ZodError`

#### Scenario: Both apps can import the request schemas

- **WHEN** `apps/api` and `apps/web` import a request schema from `@glossops/shared`
- **THEN** TypeScript resolves the import and `pnpm --filter api typecheck` and `pnpm --filter web typecheck` both pass

### Requirement: Naming and partial-update conventions

Request schemas SHALL follow the naming convention `Create<Entity>Schema`, `Update<Entity>Schema`, and `List<Entity>QuerySchema`. An update (PATCH) schema SHALL be derived from its create schema via `.partial()` wherever the update accepts the same fields as the create, so the two never drift.

#### Scenario: Update schema derives from create schema

- **WHEN** an `Update<Entity>Schema` is defined for a module whose PATCH accepts the create fields
- **THEN** it is defined as `Create<Entity>Schema.partial()` (optionally narrowed) rather than a hand-duplicated object

### Requirement: Body schemas are transform-free; query schemas coerce

Request **body** schemas SHALL be plain object schemas whose input type equals their output type (no `.transform()` that changes the type), so `apps/web` can derive form-value types directly via `z.infer`. Request **query** schemas SHALL coerce string inputs to their target types (e.g. `z.coerce.number().int().min(1)` for pagination) since query params arrive as strings.

#### Scenario: Web derives form values from a body schema

- **WHEN** `apps/web` builds a form with `zodResolver(<CreateEntitySchema>)` and `z.infer<typeof CreateEntitySchema>`
- **THEN** the form compiles and validates without a separate web-owned copy of the field shape

#### Scenario: Pagination query coerces strings to numbers

- **WHEN** a list endpoint receives `?page=2&limit=50` as query strings
- **THEN** the query schema parses them into numeric `page` and `limit` values

### Requirement: Web form schemas consume the shared schemas

`apps/web` SHALL NOT maintain standalone request-shape schemas that duplicate `@glossops/shared`. The 7 files under `apps/web/src/lib/schemas/` SHALL be removed; forms SHALL import the shared request schemas and derive value types via `z.infer`. Web-only concerns (cross-field refinements such as password confirmation, empty-string handling) MAY be layered on top of the shared base schema via composition (`.refine`, `.extend`) in `apps/web`, but the field shape itself SHALL come from `@glossops/shared`.

#### Scenario: No duplicated web schema files remain

- **WHEN** the directory `apps/web/src/lib/schemas/` is inspected after the change
- **THEN** it contains no `*.schema.ts` file that redefines a request shape already published in `@glossops/shared`

#### Scenario: Web refinement layers on shared base

- **WHEN** the register form needs a `confirmPassword` match rule
- **THEN** it composes `RegisterSchema` from `@glossops/shared` with a `.refine(...)` in `apps/web` rather than redefining the base fields
