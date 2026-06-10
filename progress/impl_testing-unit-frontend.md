# Implementation Report — testing-unit-frontend

**Date:** 2026-06-09  
**Change:** `openspec/changes/testing-unit-frontend`

## Completed in this session

### Task 5.2 — work-order-edit-drawer stories

- File: `apps/web/src/components/work-orders/work-order-edit-drawer.stories.tsx`
- Stories added: `HappyPath`, `ValidationError`, `ServerError`, `LoadingState`
- Each story has a `play()` function using `userEvent` from `@storybook/test`
- MSW handlers mock `PATCH /work-orders/wo-1`
- Mock `WorkOrderDetail` prop constructed inline to satisfy the `WorkOrderDetail` type

### Task 6.1 — customer-drawer stories upgrade

- File: `apps/web/src/components/customers/customer-drawer.stories.tsx`
- `Create.play()` upgraded: now fills firstName, lastName, email via `userEvent.type` and asserts submit button is visible
- Added `ValidationError`: submits empty form, asserts "El nombre es requerido"
- Added `ServerError`: fills required fields, submits against 500 handler, asserts drawer stays open

### Task 6.2 — vehicle-drawer stories upgrade

- File: `apps/web/src/components/customers/vehicle-drawer.stories.tsx`
- `Create.play()` upgraded: fills model field and asserts heading visible
- `Edit.play()` upgraded: clears and retypes model, clicks save, asserts button visible
- Added `ValidationError`: submits without required assetType, asserts drawer stays open
- Added `ServerError`: fills model, submits against 500 handler, asserts drawer stays open
- Added `http.get(${API}/brands)` handler to both Create/Edit/ServerError stories

### Task 6.3 — login-form Default + ServerError

- File: `apps/web/src/components/auth/login-form.stories.tsx`
- `Default.play()` upgraded: types valid email + password via `userEvent`, asserts no errors
- Added `ServerError`: fills form, submits against 500 handler, asserts "Ocurrió un error. Intenta de nuevo."

### Task 6.4 — login-form ValidationError

- Same file as 6.3
- Added `ValidationError`: types invalid email, clicks submit, asserts "Ingresa un correo válido"

### Task 6.5 — register-form stories upgrade

- File: `apps/web/src/components/auth/register-form.stories.tsx`
- `Default.play()` upgraded: fills name, email, orgName via `userEvent`, asserts button visible
- Added `ValidationError`: types invalid email format, clicks submit, asserts "Ingresa un correo válido"
- Added `ServerError`: fills all fields via `fillForm`, clicks submit against 500 handler, asserts "Ocurrió un error. Intenta de nuevo."

## Test run

```
pnpm --filter web test

Test Files  20 passed (20)
     Tests  79 passed (79)
  Duration  879ms
```

All unit tests pass with no regressions.

## Remaining tasks

Tasks 1.x through 4.x and 7.x were completed in previous sessions. Tasks 5.1, 5.2, and 6.1–6.5 are now all checked. Task 7.2 (storybook:test) requires the Storybook dev server and is a manual/CI verification step.
