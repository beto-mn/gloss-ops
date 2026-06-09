## ADDED Requirements

### Requirement: Package exists and builds

The `packages/shared` workspace package (`@glossops/shared`) SHALL be a valid TypeScript project that compiles without errors and is resolvable by all other workspace packages.

#### Scenario: Build succeeds

- **WHEN** `pnpm --filter @glossops/shared build` is run
- **THEN** it exits with code 0 and produces `dist/index.js` and `dist/index.d.ts`

### Requirement: Both apps declare the dependency

`apps/api` and `apps/web` SHALL declare `"@glossops/shared": "workspace:*"` in their `package.json` dependencies so TypeScript can resolve the import path `@glossops/shared`.

#### Scenario: Import resolves in web

- **WHEN** `apps/web` imports `{ WorkOrderStatus } from '@glossops/shared'`
- **THEN** TypeScript resolves the type without error and `pnpm --filter apps/web typecheck` passes

#### Scenario: Import resolves in api

- **WHEN** `apps/api` imports `{ Role } from '@glossops/shared'`
- **THEN** TypeScript resolves the type without error and `pnpm --filter apps/api typecheck` passes

### Requirement: Turbo respects build order

The monorepo build pipeline SHALL build `packages/shared` before `apps/api` and `apps/web`.

#### Scenario: Full build succeeds in order

- **WHEN** `pnpm -r build` is run from the repo root
- **THEN** `packages/shared` completes before either app starts compiling
