## Context

`apps/web` already has a `vitest.config.ts` with a single `storybook` project that runs browser-based tests via Playwright/Chromium. Vitest (`^4.1.7`), `@storybook/addon-vitest`, and MSW are already installed. However:

- There is no `unit` project in `vitest.config.ts` (no happy-dom environment).
- `package.json` has no `test` script — only `storybook` and `build-storybook`.
- Hooks, schemas, and utility functions have zero unit test coverage.
- `service-drawer.tsx` and `work-order-edit-drawer.tsx` have no `.stories.tsx` files.
- Several existing stories lack `play()` functions covering validation error, server error, and loading state variants.

## Goals / Non-Goals

**Goals:**

- Add a `unit` Vitest project (happy-dom) to `apps/web/vitest.config.ts` for fast, headless tests.
- Add a `test` script to `apps/web/package.json` that runs only the `unit` project.
- Write unit tests for all hooks in `src/hooks/` (mocking `apiFetch`), all schemas in `src/lib/schemas/`, and `src/lib/utils.ts`.
- Create `.stories.tsx` files for `service-drawer.tsx` and `work-order-edit-drawer.tsx` with `play()` functions.
- Upgrade existing stories (customer-drawer, vehicle-drawer, login-form, register-form) to add missing coverage variants (validation error, server error, loading state).

**Non-Goals:**

- API-level integration or E2E tests (covered by features 31 and 32).
- Visual regression or screenshot tests.
- Storybook performance or accessibility audits.
- New UI components.

## Decisions

### D1: Separate `unit` project in `vitest.config.ts`, not a standalone config file

The existing `storybook` project must remain unchanged (it uses Playwright browser). Adding a `unit` project inside the same `defineConfig` keeps a single config file and allows independent runs via `--project=unit`. Alternative (separate `vitest.unit.config.ts`) would require changing `--config` flags everywhere.

### D2: Mock `apiFetch` at the module level with `vi.mock`

Hooks call `apiFetch` directly from `@/lib/api-client`. Mocking at the module boundary (`vi.mock('@/lib/api-client', ...)`) is simpler and more reliable than intercepting `fetch` globally. Alternative (MSW in unit tests) adds browser-like complexity to a happy-dom environment for no benefit.

### D3: `test` script runs only the `unit` project

The `storybook` project is browser-based (Playwright) and slow — it should remain a separate CI step. `pnpm --filter web test` must exit in seconds for developer feedback. `--project=unit` flag limits the run to happy-dom tests.

### D4: New stories use MSW for network mocking (same pattern as existing stories)

`customer-drawer.stories.tsx` already uses `msw`/`http`/`HttpResponse` for network interception. All new stories follow the same pattern for consistency.

### D5: `play()` on stories drives assertions, not just rendering checks

Existing `play()` stubs only check that static text is visible. The upgrade should simulate real interactions: `userEvent.type`, `userEvent.click`, wait for async responses, then assert outcomes (success toast, error message, form reset).

## Risks / Trade-offs

- [Risk] `happy-dom` may diverge from real browser behavior for complex DOM operations. → Mitigation: unit tests cover pure logic (hooks, schemas, utils) — no DOM rendering. Complex UI flows stay in the storybook project.
- [Risk] Mocking `apiFetch` at module level may miss token-refresh logic. → Mitigation: `api-client.ts` exports `apiFetch` as a named function; the mock replaces the implementation entirely, which is the correct isolation boundary for hook tests.
- [Risk] New stories for `work-order-edit-drawer` may require fixture data for work order items, brands, and technicians. → Mitigation: use inline MSW handlers with minimal fixture shapes; follow the pattern in `customer-drawer.stories.tsx`.

## Migration Plan

No database or API changes. All changes are additive to the frontend:

1. Update `vitest.config.ts` — add `unit` project block.
2. Update `package.json` — add `test` script.
3. Create `src/**/__tests__/` unit test files (or colocated `.test.ts`).
4. Create missing `*.stories.tsx` files.
5. Patch existing `*.stories.tsx` files with new story variants.

Rollback: delete added test files; revert `vitest.config.ts` and `package.json` script.

## Open Questions

- None. All technical decisions are resolved above.
