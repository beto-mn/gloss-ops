# Auth Module Design

**Date:** 2026-04-15
**Status:** Approved
**Scope:** `apps/api/src/auth/`

---

## Context

GlossOps is a multi-tenant SaaS for automotive shops. Identity is modeled as `Account` — a global record shared across organizations. Membership is modeled as `OrganizationMember`, which links an `Account` to a `Branch` with a specific `Role`. For MVP, one account maps to exactly one branch membership.

---

## Decisions

| Decision              | Choice                             | Reason                                                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Auth library          | Custom NestJS guards (no Passport) | Fewer dependencies, full control, sufficient for JWT-only auth     |
| Token strategy        | Access token + Refresh token       | Better UX and security than single long-lived token                |
| Refresh token storage | Redis                              | Fast lookups, TTL support built-in, already in the stack           |
| Email verification    | None (MVP)                         | Ship faster; add later if needed                                   |
| Refresh token format  | Opaque UUID (not JWT)              | No need to carry claims; prevents info leakage; simpler revocation |

---

## Future: OAuth / Social Login

The current implementation uses custom guards. If Google, Apple, or other OAuth providers are added in the future, the recommended path is:

1. Add `passport-jwt` + `@nestjs/passport` as dependencies
2. Implement per-provider `PassportStrategy` (e.g. `GoogleStrategy`, `AppleStrategy`)
3. Keep the existing `AuthGuard` for JWT verification — it does not need to change
4. Add a new `OAuthService` that maps the OAuth profile to an existing `Account` (by email) or creates one

This migration does not require rewriting the existing auth module — it extends it.

---

## File Structure

```
apps/api/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── token.service.ts
├── redis-token.store.ts
├── guards/
│   ├── auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── current-account.decorator.ts
└── dto/
    ├── register.dto.ts
    ├── login.dto.ts
    └── token-response.dto.ts
```

---

## JWT Access Token Payload

```ts
{
  sub: string // Account.id
  memberId: string // OrganizationMember.id — null if account has no membership yet
}
```

The JWT carries the minimum needed to identify the session (principle of least privilege). On every authenticated request, `AuthGuard` loads the full membership context (branchId, organizationId, role) from the DB using `memberId`. The DB is the single source of truth — no stale role data.

**`request.user` shape (after AuthGuard resolves):**

```ts
{
  sub: string
  memberId: string | null
  // loaded from DB:
  email: string
  branchId: string | null
  organizationId: string | null
  role: Role | null
}
```

> **Future optimization:** if DB query latency becomes a concern at scale, cache the membership context in Redis with a short TTL (e.g., 5 min) and flush on role change. Not needed for MVP.

---

## Endpoints

| Method | Route            | Auth          | Description                                                                     |
| ------ | ---------------- | ------------- | ------------------------------------------------------------------------------- |
| `POST` | `/auth/register` | `@Public()`   | Creates `Account` only. Returns tokens (no membership yet).                     |
| `POST` | `/auth/login`    | `@Public()`   | Validates credentials. Returns tokens + membership claims if membership exists. |
| `POST` | `/auth/refresh`  | `@Public()`   | Receives refresh token, returns new access token.                               |
| `POST` | `/auth/logout`   | Authenticated | Deletes refresh token from Redis.                                               |

> **Note:** `OrganizationMember` is created through the onboarding flow (Organizations module), not during registration. An account without a membership receives a token with `memberId`, `branchId`, `organizationId`, and `role` as `null`. Protected routes that require membership will return `403 no_membership`.

---

## Token Flow

### Register

1. Validate email uniqueness — if taken: `409 email_already_registered`
2. Hash password with bcrypt
3. Create `Account` in DB
4. Issue access token with `memberId`, `branchId`, `organizationId`, `role` as `null`
5. Generate and store opaque refresh token in Redis
6. Return `{ accessToken, refreshToken, expiresIn }`

### Login

1. Find `Account` by email — if not found: `401 invalid_credentials`
2. Compare password hash — if mismatch: `401 invalid_credentials`
3. Load `OrganizationMember` if exists (nullable)
4. `TokenService` issues access token (15 min) signed with `JWT_ACCESS_SECRET`, membership claims included if membership exists
5. `TokenService` generates opaque refresh token (UUID v4)
6. Refresh token saved to Redis: key `refresh:{accountId}:{tokenId}`, TTL 30 days
7. Return `{ accessToken, refreshToken, expiresIn }`

### Refresh

1. Receive `refreshToken` in request body
2. Look up in Redis — if not found: `401 Unauthorized`
3. Load fresh `Account` + `OrganizationMember` from DB
4. Rotate: delete old refresh token from Redis, issue new access + refresh tokens
5. Return `{ accessToken, refreshToken, expiresIn }`

### Logout

1. Delete `refresh:{accountId}:{tokenId}` from Redis
2. Access token expires naturally within its 15-minute window

---

## Guards and Decorators

### `AuthGuard` (global)

- Extracts `Bearer <token>` from `Authorization` header
- Verifies signature and expiry with `JwtService`
- If valid: attaches payload to `request.user`
- If invalid or missing: `401 Unauthorized`
- If route has `@Public()`: passes without verification

### `RolesGuard` (per-route)

- Reads `@Roles(Role.OWNER, Role.MANAGER)` from handler metadata
- Compares against `request.user.role`
- If insufficient role: `403 Forbidden`

### Decorators

```ts
@Public()               // skips AuthGuard
@Roles(Role.OWNER)      // requires specific role(s)
@CurrentAccount()       // injects full payload into handler parameter
```

---

## Error Responses

All errors return `{ error: '<code>' }` so the frontend can distinguish them without parsing messages.

| Case                          | HTTP  | Code                       |
| ----------------------------- | ----- | -------------------------- |
| Email already registered      | `409` | `email_already_registered` |
| Invalid credentials           | `401` | `invalid_credentials`      |
| Access token expired          | `401` | `token_expired`            |
| Refresh token invalid/expired | `401` | `invalid_refresh_token`    |
| Insufficient role             | `403` | `insufficient_role`        |
| Account has no membership     | `403` | `no_membership`            |

---

## Testing Strategy

### Unit Tests

- `AuthService` — register with duplicate email, login with valid/invalid credentials, account with no membership
- `TokenService` — access token carries correct claims, refresh token rotation
- `RedisTokenStore` — save, retrieve, delete tokens (Redis mocked)
- `AuthGuard` — valid token passes, expired token throws 401, public route passes without token
- `RolesGuard` — correct role passes, insufficient role throws 403

### E2E / Integration Tests

- `POST /auth/register` — happy path, duplicate email
- `POST /auth/login` — happy path, wrong credentials
- `POST /auth/refresh` — valid token rotates, invalid token 401, expired token 401
- `POST /auth/logout` — deletes token, second logout returns 401

E2E tests run against a real PostgreSQL + Redis test instance. No infrastructure mocks — this ensures test behavior matches production.

---

## Environment Variables

```env
JWT_ACCESS_SECRET=<secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
REDIS_URL=redis://localhost:6379
```
