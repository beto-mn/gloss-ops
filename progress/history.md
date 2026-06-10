# Session History

## 2026-06-09 — testing_unit_frontend

**Status:** done  
**Spec:** `openspec/changes/archive/2026-06-09-testing-unit-frontend/`

### Summary

- Vitest `unit` project (happy-dom) added to `apps/web/vitest.config.ts`
- `test` script added to `apps/web/package.json`
- 20 unit test files created: 11 hooks, 7 schemas, `api-client`, `utils` — 79 tests passing
- `api-client.test.ts` covers 401+refresh, 401+no-refresh, refresh failure, network error paths
- `service-drawer.stories.tsx` and `work-order-edit-drawer.stories.tsx` created with 4 story variants each
- Existing stories (customer-drawer, vehicle-drawer, login-form, register-form) upgraded with ValidationError/ServerError variants
- 51 Storybook play() tests passing in Chromium (headless)
- Fixes: `@storybook/test` import, `viteFinal` for `@glossops/shared` ESM, `findBy` async queries, `form.novalidate` for browser HTML5 constraint bypass

## <!-- Sessions are appended here when closed. Format:

## YYYY-MM-DD — <feature-name>

**Agent:** <leader|implementer|reviewer>
**Summary:** <one-line summary>
**Result:** done | blocked | in_progress
-->

## 2026-06-08 — packages_shared

**Agent:** leader + implementer + reviewer
**Summary:** Created `packages/shared` entity Zod schemas (14 entities), consolidated all domain enums, wired `@glossops/shared` in both apps, migrated inline `z.enum([...])` in `apps/web` to shared imports.
**Result:** done
