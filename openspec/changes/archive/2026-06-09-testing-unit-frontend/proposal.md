## Why

The frontend (`apps/web`) has no automated test coverage. Components and hooks are validated only through manual Storybook browsing, which is slow and error-prone. Introducing a Vitest unit project and adding `play()` interaction functions to existing stories creates a fast, repeatable safety net for hooks, schemas, and UI flows.

## What Changes

- A `vitest.config.ts` **unit** project is added to `apps/web`, running in a `happy-dom` environment.
- A `test` script is added to `apps/web/package.json` that executes the unit project.
- Hooks in `src/hooks/` are unit-tested with a mocked `apiFetch`.
- Utility functions in `src/lib/` (formatters, validators) are unit-tested.
- Zod schemas from `@glossops/shared` and local `src/lib/schemas/` are unit-tested for valid/invalid inputs.
- Existing Storybook stories for major drawers and forms are upgraded with `play()` functions that simulate full user interactions (fill → submit → assert outcome).
- Stories must cover: happy path, validation error, server error, and loading state for every major drawer/form.

## Capabilities

### New Capabilities

- `frontend-unit-testing`: Vitest unit project in `apps/web` — covers hooks (mocked apiFetch), utility functions, and Zod schemas with `happy-dom` environment.
- `storybook-play-functions`: Storybook `play()` interaction tests on existing stories for major drawers/forms, covering happy path, validation error, server error, and loading state.

### Modified Capabilities

## Impact

- **apps/web**: new `vitest.config.ts`, updated `package.json` (`test` script), new `src/**/*.test.ts(x)` files.
- **apps/web (Storybook)**: existing `*.stories.tsx` files extended with `play()` functions.
- **No API changes** — all tests are client-side only.
- **New dev-dependencies**: `vitest`, `@vitest/browser` or `happy-dom`, `@storybook/test`, `@storybook/addon-interactions` (if not already installed).
