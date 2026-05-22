# Design: Auth Module

## Context

GlossOps is a multi-tenant SaaS for automotive shops. Identity is modeled as `Account` — a global record shared across organizations. Membership is modeled as `OrganizationMember`, which links an `Account` to a `Branch` with a specific `Role`. For MVP, one account maps to exactly one branch membership.

## Goals

- Register, login, refresh, and logout endpoints secured with JWT + Redis-backed refresh tokens
- Global `AuthGuard` loads full membership context from DB on every authenticated request
- `RolesGuard` enforces role-based access per route
- `@Public()`, `@Roles()`, and `@CurrentAccount()` decorators for declarative access control

## Non-Goals

- Email verification (deferred post-MVP)
- OAuth / Social login (future extension via Passport strategies)
- Caching membership context in Redis (future optimization if DB latency becomes a concern)

## Decisions

| Decision              | Choice                             | Reason                                                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Auth library          | Custom NestJS guards (no Passport) | Fewer dependencies, full control, sufficient for JWT-only auth     |
| Token strategy        | Access token + Refresh token       | Better UX and security than a single long-lived token              |
| Refresh token storage | Redis                              | Fast lookups, TTL support built-in, already in the stack           |
| Refresh token format  | Opaque UUID (not JWT)              | No need to carry claims; prevents info leakage; simpler revocation |
| Email verification    | None (MVP)                         | Ship faster; add later if needed                                   |

## Risks / Trade-offs

- DB query on every authenticated request to load fresh membership — accepted for MVP correctness; can be mitigated with a short-TTL Redis cache if latency becomes an issue
- Custom guards must be kept in sync with any future OAuth additions; the recommended migration path is additive (new `OAuthService` + per-provider strategies) without rewriting the existing guards
