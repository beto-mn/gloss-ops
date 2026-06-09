## ADDED Requirements

### Requirement: @glossops/shared resolvable in apps/web

`apps/web` SHALL declare `@glossops/shared` as a workspace dependency so that TypeScript and the Next.js compiler resolve imports from that path at both typecheck and build time.

#### Scenario: Shared import compiles in web

- **WHEN** `apps/web/src/` imports any export from `@glossops/shared`
- **THEN** `pnpm --filter apps/web typecheck` exits with code 0 and no unresolved module errors are reported
