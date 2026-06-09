# Conventions

> Reviewers and implementers must read this file before touching any code.

## Import Organization

Imports are grouped into six tiers separated by a blank line. Within each tier, single-line imports come first (longest to shortest), then multi-line imports (longest to shortest).

```ts
// Tier 1 — external public npm packages
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  UnauthorizedException,
  ExecutionContext,
  CanActivate,
  Injectable,
} from '@nestjs/common'

// Tier 2 — private/internal company libraries (e.g. @retorna-tech/*, @company/*)
import { SomeUtil } from '@retorna-tech/utils'

// Tier 3 — workspace/monorepo packages (@glossops/*)
import { Role } from '@glossops/database'

// Tier 4 — TypeScript path aliases (@ prefixed, defined in tsconfig.paths.json)
import type { AuthContext } from '@auth/interfaces'
import { IS_PUBLIC_KEY } from '@auth/decorators'
import { PrismaService } from '@prisma'

// Tier 5 — relative imports (./ or ../)
import { TokenService } from '../token.service'

// Tier 6 — side-effect imports (no bindings, run for their side effects)
import 'dotenv/config'
```

**Rules:**

- Skip a tier entirely if it has no imports — do not leave an empty blank line
- Side-effect imports (e.g. `import 'dotenv/config'`) are always Tier 6 (last), even if they must run first at runtime. `main.ts` is a known exception: `dotenv/config` must load env vars before modules are evaluated, so it stays at the top functionally — it is not moved to Tier 6 in that file
- Use `import type` whenever only the type is needed (not the value at runtime)
- Within a tier: single-line imports first (sorted longest → shortest line), then multi-line imports (sorted longest → shortest)

## Barrel Exports (index.ts)

Each `index.ts` re-exports from sibling files. Exports are sorted by line length, longest first.

```ts
export { RedisTokenStore } from './redis-token.store' // 53 chars — first
export { AuthController } from './auth.controller' // 51 chars
export { TokenService } from './token.service' // 47 chars
export { AuthService } from './auth.service' // 44 chars
export { AuthModule } from './auth.module' // 42 chars — last
```

**Rules:**

- One export per line — no grouping multiple modules into one export statement
- Use `export type` for interfaces and types
- No blank lines between exports within the same barrel
- Order by line length, longest → shortest

## Repository Pattern (all domain modules)

Every domain module MUST follow this structure:

```
<module>/
  interfaces/
    <entity>.repository.interface.ts   ← contract
    index.ts                           ← barrel (types only)
  infrastructure/
    prisma-<entity>.repository.ts      ← Prisma implementation
    in-memory-<entity>.repository.ts   ← in-memory implementation for tests
  <module>.tokens.ts                   ← DI injection token symbols
  <module>.module.ts                   ← binds tokens to implementations
  <module>.service.ts                  ← depends on interfaces only
```

**Rules:**

- `PrismaService` may only be injected inside `infrastructure/` classes — never in services, guards, or controllers
- Injection tokens are named `SCREAMING_SNAKE_CASE` and defined in `<module>.tokens.ts`
- Interface names end with `Interface` (e.g., `AccountRepositoryInterface`)
- In tests, bind `{ provide: TOKEN, useClass: InMemoryXxx }` — no Prisma/Redis mocks
- `InMemoryX` implementations live in `infrastructure/`, not in test files

See `apps/api/src/auth/` for the reference implementation.

## Storybook (apps/web)

Every new UI component gets a colocated `*.stories.tsx` file. Infrastructure is already configured — do not re-run setup steps.

**Rules:**

- Story files live next to the component: `foo.tsx` → `foo.stories.tsx`
- Use `satisfies Meta<typeof Component>` (not `Meta<typeof Component>` annotation)
- Import `expect` from `'storybook/test'`; `canvas`, `userEvent`, `canvasElement` come from play arguments — do not import them
- Start every meta with `tags: ['ai-generated']`
- Global MSW handlers live in `.storybook/msw-handlers.ts`; per-story overrides go in `parameters.msw.handlers`
- Add a `play` only when it proves something non-trivial (interaction, async data, MSW response, CSS-driven state). Skip `play` on variant-only stories
- Exactly one `CssCheck` story exists across the whole project (currently in `button.stories.tsx`) — do not add another
- After writing stories, verify with: `npx vitest --project storybook run`
- Strip `'needs-work'` from files whose tests pass; leave it on files that still fail
- For story conventions, run `npx storybook ai setup` and follow its output

## Frontend Conventions

- App Router structure: `src/app/` for routes, `src/components/` for shared UI, `src/lib/` for utilities
- Path aliases: `@/*` → `src/*` (configured in `tsconfig.json`)
- Storybook stories: colocated with components as `<Component>.stories.tsx`
- No direct fetch calls — all API communication via TanStack Query hooks in `src/hooks/`
- Form schemas defined with Zod, colocated with the form component or in `src/lib/schemas/`
- Icons: Lucide React (stroke-width 1.5, outline style — no emojis as icons)
- Font: Plus Jakarta Sans (300/400/500/600/700)
