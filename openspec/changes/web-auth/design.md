## Context

The API provides `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, and `POST /auth/logout`. The token system has two layers:

- **Access token** — JWT signed with HS256, TTL **15 minutes**. Carries `{ sub: accountId, email }`. Validated on every protected API request.
- **Refresh token** — Opaque string `{accountId}:{tokenId}`, TTL **30 days**, stored in Redis. Accepted and returned in the request/response body. On each successful refresh the old token is deleted and a new pair is issued (rotation).

Session lifecycle:

1. User signs in or registers → receives `{ accessToken, refreshToken, expiresIn }`.
2. Access token expires (15 min) → frontend transparently calls `POST /auth/refresh` and retries the original request.
3. Refresh token expires (30 days) or user signs out → `POST /auth/refresh` returns 401 `invalid_refresh_token` → both tokens cleared → user redirected to `/login`.

The frontend has no auth flow yet — this design covers sign in, sign up, sign out, and token management. Route protection (middleware, guards) is deferred to a separate `auth-middleware` change.

## Goals / Non-Goals

**Goals:**

- Sign in screen (email + password) following Gulf Racing design system
- Sign up screen (name, email, org name, password, confirm password)
- Sign out — clears tokens, calls `POST /auth/logout`, redirects to `/login`
- RHF + Zod validation (client-side, before any network call)
- TanStack Query mutations for login, register, and logout
- Store both tokens on success and redirect to `/dashboard`
- HTTP client with automatic token refresh interceptor (retry on 401)
- Redirect to `/login` when refresh token is expired or invalid
- Storybook stories for `LoginForm` and `RegisterForm`

**Non-Goals:**

- Password reset / forgot password flow (future change)
- OAuth / social login (future change)
- Route protection / middleware (future change — `auth-middleware`)
- Remember me / persistent sessions beyond current token TTL
- Multi-org selector on login (org context comes from JWT payload)

## Decisions

### 1. Route group `(auth)` for auth layout isolation

Use Next.js route group `src/app/(auth)/` with a shared `layout.tsx` (full-screen centered, no navbar). Pages: `(auth)/login/page.tsx` and `(auth)/register/page.tsx`. URLs are `/login` and `/register` — the group name is invisible.

**Alternative considered:** Flat routes `src/app/login/` and `src/app/register/` — no shared layout without duplication.

### 2. Both tokens in `localStorage`

Store `accessToken` (key: `gloss_access_token`) and `refreshToken` (key: `gloss_refresh_token`) in `localStorage` after sign in or register.

The API returns the refresh token in the response body and accepts it in the request body — it does not set an HttpOnly cookie. Both tokens must therefore live client-side.

**Trade-off:** Both tokens are XSS-accessible. Accepted for now — a future `auth-hardening` change will evaluate memory storage + BFF cookie pattern. The 15-min access token TTL limits exposure; the refresh token (30 days) is the higher-value target.

### 3. Fetch client with refresh interceptor in `src/lib/api-client.ts`

Create a thin fetch wrapper (`apiFetch`) that:

1. Attaches `Authorization: Bearer <accessToken>` to every request.
2. On 401 response: calls `POST /auth/refresh` with the stored refresh token.
3. If refresh succeeds: stores the new token pair and retries the original request once.
4. If refresh fails (`invalid_refresh_token` or network error): clears both tokens from `localStorage` and redirects to `/login`.

All TanStack Query hooks use this client — never raw `fetch`.

**Alternative considered:** TanStack Query `onError` for 401 — too late; interceptor retries transparently before the query sees the error.

### 4. Sign out calls `POST /auth/logout` before clearing tokens

Sign out flow:

1. Call `POST /auth/logout` with the stored refresh token (invalidates it in Redis).
2. Clear both tokens from `localStorage`.
3. Redirect to `/login`.

If the logout request fails (network error), still clear tokens and redirect — optimistic sign out is safer than leaving the user stuck.

### 5. `useLogin`, `useRegister`, `useLogout` in `src/hooks/use-auth.ts`

Single file for all auth mutations. Consistent with the app-wide pattern — no direct `fetch` calls in components.

### 6. Zod schemas in `src/lib/schemas/auth.schema.ts`

- `loginSchema` — email (valid format) + password (min 8 chars)
- `registerSchema` — name (min 2 chars) + email + orgName (min 2 chars) + password (min 8 chars) + confirmPassword (must match password)

### 7. Page-level design override at `design-system/glossops/pages/auth.md`

Covers both auth pages: centered card layout, brand panel (logo + tagline), responsive stacking on mobile. Extends MASTER.md tokens.

## Risks / Trade-offs

- **Both tokens in localStorage (XSS risk)** → Mitigated in future `auth-hardening` change. 15-min access TTL limits blast radius.
- **Refresh token rotation = single-use** → If client fails to persist new tokens mid-flight (e.g. tab closed), session is lost → user logs in again. Acceptable edge case.
- **Concurrent 401s** → Two simultaneous requests could both trigger refresh. Defer deduplication to `auth-hardening` — low traffic at this stage.
- **No route guard yet** → `/dashboard` is unprotected until `auth-middleware` change.
- **Optimistic sign out** → Logout clears tokens even if `POST /auth/logout` fails. Preferred over leaving the user unable to sign out on network error.

## Open Questions

- Should the register page link to login and vice versa? → Yes, standard UX.
- Should failed login/register clear the password fields? → Yes, standard UX pattern.
