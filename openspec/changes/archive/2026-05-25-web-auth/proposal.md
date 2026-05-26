## Why

The web app has no authentication flow — users can't sign in, create an account, or sign out. The API already exposes `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, and `POST /auth/logout`; the frontend needs to wire up all three user-facing flows.

## What Changes

- New route group `(auth)` with shared full-screen layout
- New `(auth)/login/page.tsx` — sign in screen with email + password
- New `(auth)/register/page.tsx` — sign up screen with name, email, org name, and password
- New `LoginForm` component — RHF + Zod, email + password, loading/error states
- New `RegisterForm` component — RHF + Zod, name + email + org name + password + confirm password
- New `useLogin`, `useRegister`, `useLogout` hooks — TanStack Query mutations
- New `auth.schema.ts` — Zod schemas for all auth forms
- New `api-client.ts` — fetch wrapper with automatic token refresh interceptor
- Token storage in `localStorage` (access + refresh tokens)
- Redirect to `/dashboard` on successful login or register
- Sign out button clears tokens, calls `POST /auth/logout`, redirects to `/login`
- Storybook stories for `LoginForm` and `RegisterForm`

## Capabilities

### New Capabilities

- `web-auth`: Complete frontend authentication — sign in, sign up, sign out, token storage, and automatic refresh flow

### Modified Capabilities

<!-- none -->

## Impact

- `apps/web/src/app/(auth)/` — new route group with login and register pages
- `apps/web/src/components/auth/` — `LoginForm`, `RegisterForm` components + stories
- `apps/web/src/hooks/use-auth.ts` — `useLogin`, `useRegister`, `useLogout` hooks
- `apps/web/src/lib/api-client.ts` — HTTP client with refresh interceptor
- `apps/web/src/lib/schemas/auth.schema.ts` — Zod schemas for all auth forms
- `design-system/glossops/pages/auth.md` — page-level design override for auth screens
- No API changes — all endpoints already exist
