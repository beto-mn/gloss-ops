# Verification Guide

> Run these checks before declaring any task done. `./init.sh` covers all of them automatically.

## Quick checks

```bash
# Full harness verification (run this first)
./init.sh

# API tests only
pnpm --filter api test

# Type check all packages
pnpm --filter api build

# Lint
pnpm lint

# Format check
pnpm format:check
```

## Before declaring a feature done

1. `./init.sh` exits with code 0
2. All tasks in `specs/<feature>/tasks.md` (or `openspec/changes/<name>/tasks.md`) are marked `[x]`
3. Every requirement `R<n>` has at least one passing test
4. No debug prints (`console.log`, `console.error`) left in `src/`
5. No TODOs without a linked issue or tracking context

## API tests

The API test suite uses in-memory repositories — no Prisma or Redis required. Tests run offline.

```bash
# Run all API tests
pnpm --filter api test

# Run a specific test file
pnpm --filter api test -- --testPathPattern="auth.service"

# Run with coverage
pnpm --filter api test:cov
```

Expected baseline: **596 tests across 54 suites**, all passing.

## Frontend tests (when web is implemented)

```bash
# Unit + integration
pnpm --filter web test

# Storybook interaction tests
npx vitest --project storybook run
```

## Database

```bash
# Apply pending migrations
pnpm --filter database db:migrate:dev

# Reset and reseed (dev only)
pnpm --filter database db:reset
```
