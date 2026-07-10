## ADDED Requirements

### Requirement: Global Zod validation pipe

`apps/api` SHALL validate every incoming request through a global `ZodValidationPipe` (from `nestjs-zod`) wired in `main.ts`, replacing the class-validator `ValidationPipe`. Every request body, query, and route param across all 16 modules SHALL be validated against a Zod request schema published by `@glossops/shared`, consumed via a thin `createZodDto` wrapper. Unknown keys SHALL be stripped, preserving the current `whitelist: true` behavior.

#### Scenario: Valid request passes validation

- **WHEN** a request with a payload matching its endpoint's Zod schema is received
- **THEN** the pipe parses it, the controller receives the typed value, and the request proceeds

#### Scenario: Invalid request is rejected with 400

- **WHEN** a request with a payload that fails its Zod schema is received
- **THEN** the pipe throws and the API responds with HTTP 400

#### Scenario: Unknown keys are stripped

- **WHEN** a request body includes keys not present in its schema
- **THEN** the parsed value passed to the controller omits those keys (no unknown data reaches the service)

### Requirement: OpenAPI documentation preserved

The Swagger UI at `/api-docs` SHALL continue to document every endpoint's request schema after the migration. OpenAPI generation SHALL derive request schemas from the Zod-based `createZodDto` classes (finalized with `cleanupOpenApiDoc`), and the class-validator/`@nestjs/swagger` `@ApiProperty` decorators on request DTOs SHALL be removed.

#### Scenario: Swagger renders request schemas

- **WHEN** `GET /api-docs` is opened after the migration
- **THEN** each documented endpoint shows its request body/query schema derived from the Zod schema

### Requirement: class-validator and class-transformer removed

`apps/api` SHALL NOT depend on `class-validator` or `class-transformer`. Both packages SHALL be removed from `apps/api/package.json`, and no source file under `apps/api/src` SHALL import from either package.

#### Scenario: Dependencies are gone

- **WHEN** `apps/api/package.json` dependencies are inspected and `apps/api/src` is searched for imports
- **THEN** neither `class-validator` nor `class-transformer` appears in dependencies or import statements

### Requirement: Existing behavior and test suites preserved

The migration SHALL NOT change any external request/response contract, business rule, RBAC, or folio logic. All existing unit tests and integration (e2e) tests SHALL continue to pass, and `apps/web` typecheck and unit tests SHALL stay green.

#### Scenario: Full verification passes

- **WHEN** `pnpm --filter api test`, `pnpm --filter api test:e2e`, `pnpm --filter web typecheck`, and `pnpm --filter web test` are run after the change
- **THEN** all suites pass and `./init.sh` exits green
