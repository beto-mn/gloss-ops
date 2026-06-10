## 1. Vitest Unit Project Setup

- [x] 1.1 Add the `unit` project block to `apps/web/vitest.config.ts` — environment `happy-dom`, path alias resolution for `@/*`, named `unit`; keep existing `storybook` project intact
- [x] 1.2 Add a `"test": "vitest --project=unit"` script to `apps/web/package.json`
- [x] 1.3 Verify `pnpm --filter web test` exits 0 with no test files (empty run sanity check)

## 2. Utility and Schema Unit Tests

- [x] 2.1 Create `apps/web/src/lib/utils.test.ts` — test `cn()` for class merging and Tailwind deduplication
- [x] 2.2 Create `apps/web/src/lib/schemas/customer.schema.test.ts` — valid parse and invalid parse (ZodError)
- [x] 2.3 Create `apps/web/src/lib/schemas/work-order.schema.test.ts` — valid parse and invalid parse
- [x] 2.4 Create `apps/web/src/lib/schemas/service.schema.test.ts` — valid parse and invalid parse
- [x] 2.5 Create `apps/web/src/lib/schemas/invoice.schema.test.ts` — valid parse and invalid parse
- [x] 2.6 Create `apps/web/src/lib/schemas/auth.schema.test.ts` — valid parse and invalid parse
- [x] 2.7 Create `apps/web/src/lib/schemas/warranty.schema.test.ts` — valid parse and invalid parse
- [x] 2.8 Create `apps/web/src/lib/schemas/customer-asset.schema.test.ts` — valid parse and invalid parse

## 3. apiFetch Error Boundary Tests

- [x] 3.0 Create `apps/web/src/lib/api-client.test.ts` — mock global `fetch`; test: 401 + valid refresh token retries and returns data; 401 + refresh fails clears tokens and rejects with ApiError(401); 401 + no refresh token rejects immediately; network error (fetch throws) propagates as rejection

## 4. Hook Unit Tests

- [x] 4.1 Create `apps/web/src/hooks/use-customers.test.ts` — mock `apiFetch`, test query returns data; mutation calls apiFetch with correct args
- [x] 4.2 Create `apps/web/src/hooks/use-work-orders.test.ts` — mock `apiFetch`, test query and mutation
- [x] 4.3 Create `apps/web/src/hooks/use-services.test.ts` — mock `apiFetch`, test query and mutation
- [x] 4.4 Create `apps/web/src/hooks/use-customer-assets.test.ts` — mock `apiFetch`, test query and mutation
- [x] 4.5 Create `apps/web/src/hooks/use-invoices.test.ts` — mock `apiFetch`, test query and mutation
- [x] 4.6 Create `apps/web/src/hooks/use-warranties.test.ts` — mock `apiFetch`, test query
- [x] 4.7 Create `apps/web/src/hooks/use-brands.test.ts` — mock `apiFetch`, test query
- [x] 4.8 Create `apps/web/src/hooks/use-members.test.ts` — mock `apiFetch`, test query
- [x] 4.9 Create `apps/web/src/hooks/use-checkpoints.test.ts` — mock `apiFetch`, test query and mutation
- [x] 4.10 Create `apps/web/src/hooks/use-work-order-assignments.test.ts` — mock `apiFetch`, test mutation
- [x] 4.11 Create `apps/web/src/hooks/use-auth.test.ts` — mock `apiFetch`, test login/logout/register mutations

## 5. New Storybook Stories with play() Functions

- [x] 5.1 Create `apps/web/src/components/services/service-drawer.stories.tsx` with stories: `HappyPath`, `ValidationError`, `ServerError`, `LoadingState`; each with a `play()` function using `userEvent`
- [x] 5.2 Create `apps/web/src/components/work-orders/work-order-edit-drawer.stories.tsx` with stories: `HappyPath`, `ValidationError`, `ServerError`, `LoadingState`; each with a `play()` function using `userEvent`

## 6. Upgrade Existing Stories with Missing Coverage

- [x] 6.1 Add `ValidationError` and `ServerError` story variants to `apps/web/src/components/customers/customer-drawer.stories.tsx`; upgrade `Create.play()` to actually fill required fields and assert success outcome
- [x] 6.2 Add `ValidationError` and `ServerError` story variants to `apps/web/src/components/customers/vehicle-drawer.stories.tsx`; upgrade existing `play()` to fill fields and assert outcome
- [x] 6.3 Add `ServerError` story variant to `apps/web/src/components/auth/login-form.stories.tsx`; upgrade `Default.play()` to fill email + password and assert no validation errors
- [x] 6.4 Add `ValidationError` story (invalid email format) to `apps/web/src/components/auth/login-form.stories.tsx`
- [x] 6.5 Add `ValidationError` and `ServerError` story variants to `apps/web/src/components/auth/register-form.stories.tsx`; upgrade existing `play()` to fill all fields and assert outcome

## 7. Verification

- [x] 7.1 Run `pnpm --filter web test` — all unit tests pass
- [x] 7.2 Run `pnpm --filter web storybook:test` (or equivalent) — all storybook play() tests pass
- [x] 7.3 Verify `vitest.config.ts` contains both `unit` (happy-dom) and `storybook` projects
