# Organizations Module — Design Spec

**Date:** 2026-04-23
**Status:** Approved

---

## Context

The `auth/` module currently creates only an `Account` on registration. The `AuthContext` exits with `organizationId: null` and `role: null`. This spec covers:

1. Integrating organization creation into `POST /auth/register`
2. Removing org context from the JWT (simplifying the token)
3. Updating `AuthGuard` to resolve org context from a request header
4. Building the `OrganizationsModule` for org management, member listing, and invitations

---

## Decisions

### JWT simplified

JWT payload changes from `{ sub, memberId }` to `{ sub, email }`. Org context is no longer baked into the token — it is resolved per-request from the `X-Organization-Id` header.

### Org context via header

Every protected request that requires org context includes:

```
X-Organization-Id: <organizationId>
```

The `AuthGuard` reads this header, looks up the `OrganizationMember` record for `(accountId, organizationId)`, and builds the full `AuthContext`. Routes that don't need org context (e.g. `GET /organizations`) work without the header.

### Register creates org atomically (best effort)

`POST /auth/register` creates `Account` then `Organization + Branch + OrganizationMember` in two sequential repository calls. No DB transaction wraps them for now — this is an accepted MVP limitation. See `docs/decisions/deferred-transactions.md` for the future implementation plan.

### Multi-org support

An `Account` can belong to up to **5 organizations**. Role is stored in `OrganizationMember.role`, not on the account — a user can have different roles in different organizations.

### Invitations — simple token-based, no table

Invitations are signed JWTs (7-day expiry) containing `{ orgId, email, role }`. No `Invitation` table. The signing secret is a dedicated env var (`JWT_INVITATION_SECRET`).

---

## Auth Module Changes

### `RegisterDto` — new fields

```ts
organizationName: string   // "Taller El Mejor"
organizationSlug: string   // "taller-el-mejor" — validated: lowercase, alphanumeric + hyphens
```

Slug is validated with a regex (`/^[a-z0-9-]+$/`). If the user does not provide it, the frontend auto-generates it from `organizationName`.

### `AuthService.register()` — updated flow

1. Check email uniqueness → `409 email_already_registered`
2. Hash password
3. `AccountRepository.create()` → creates `Account`
4. `OrganizationRepository.createWithBranch()` → creates `Organization` + `Branch (isMain: true)` + `OrganizationMember (role: OWNER)`
5. Issue tokens: `{ sub: accountId, email }`

### `TokenService` — updated payload

```ts
// JwtPayload
{ sub: string; email: string }
```

`issueTokens(accountId, email)` — `memberId` parameter removed.
`rotateTokens(accountId, tokenId, email)` — updated accordingly.

### `AuthGuard` — updated logic

```
1. Extract Bearer token → verify JWT → { sub, email }
2. Read X-Organization-Id header
3. If header present:
     → find OrganizationMember for (sub, organizationId)
     → if not found → 403 not_a_member
     → populate memberId, branchId, role
4. If header absent:
     → organizationId: null, memberId: null, branchId: null, role: null
5. Attach AuthContext to request
```

`AuthContext` shape is unchanged: `{ sub, email, memberId, branchId, organizationId, role }`.

---

## OrganizationsModule

### File structure

```
organizations/
  interfaces/
    organization.repository.interface.ts
    index.ts
  infrastructure/
    prisma-organization.repository.ts
    in-memory-organization.repository.ts
  organizations.tokens.ts
  organizations.module.ts
  organizations.service.ts
  organizations.controller.ts
  index.ts
```

### Endpoints

| Method | Route | Description | Required role |
|--------|-------|-------------|---------------|
| `GET` | `/organizations` | List orgs the account belongs to | Any authenticated |
| `GET` | `/organizations/me` | Get active org detail | Any member |
| `PATCH` | `/organizations/me` | Update org name / logoUrl | OWNER, MANAGER |
| `GET` | `/organizations/me/members` | List members of active org | Any member |
| `POST` | `/organizations/invitations` | Generate invitation link | OWNER, MANAGER |
| `POST` | `/organizations/invitations/accept` | Accept invitation | `@Public()` |

`GET /organizations` does not require `X-Organization-Id` — it uses only the JWT `sub` to list all memberships.

### Supporting types

```ts
// Org + the role the account holds in it (for GET /organizations list)
type OrganizationWithRole = Organization & { role: Role }

// Member record + the linked account info (for GET /organizations/me/members)
type MemberWithAccount = OrganizationMember & {
  account: Pick<Account, 'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'>
}
```

### `OrganizationRepositoryInterface`

```ts
findById(id: string): Promise<Organization | null>
findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]>
update(id: string, data: UpdateOrgData): Promise<Organization>
createWithBranch(data: CreateOrgData, accountId: string): Promise<{ organization: Organization; member: OrganizationMember }>
listMembers(organizationId: string): Promise<MemberWithAccount[]>
findMember(accountId: string, organizationId: string): Promise<OrganizationMember | null>
countMembershipsByAccount(accountId: string): Promise<number>
addMember(organizationId: string, accountId: string, role: Role): Promise<OrganizationMember>
```

> **Note — `OrganizationMember` links to `branchId`, not `organizationId`.**
> `findMember` and `addMember` accept `organizationId` at the interface level for simplicity.
> The Prisma implementation resolves this by joining through `Branch`:
> - `findMember` → `WHERE branch.organization_id = ? AND account_id = ?`
> - `addMember` → uses the org's main branch (`isMain: true`) as the target `branchId`

### Injection token

```ts
// organizations.tokens.ts
export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY')
```

### Invitation flow

**`POST /organizations/invitations`** — body: `{ email: string, role: Role }`

- Requires `X-Organization-Id` header + OWNER or MANAGER role
- Signs a JWT: `{ orgId, email, role }`, expires in 7 days, secret: `JWT_INVITATION_SECRET`
- Returns `{ invitationUrl: string }` — frontend is responsible for sending the email (for now)
- Future: trigger email send via a queue

**`POST /organizations/invitations/accept`** — body: `{ token: string, firstName?: string, lastName?: string, password?: string }`

- `@Public()` — no auth required
- Validates invitation JWT → extracts `{ orgId, email, role }`
- Checks account with that email exists:
  - **Exists:** check org membership cap (≤5) → `addMember()` → issue tokens
  - **Does not exist:** requires `firstName`, `lastName`, `password` in body → `AccountRepository.create()` → `addMember()` → issue tokens
- Returns standard `TokenPair`

---

## Error Catalog

### Registration

| Case | Exception |
|------|-----------|
| Email already registered | `409 ConflictException { error: 'email_already_registered' }` |
| Slug already taken | `409 ConflictException { error: 'slug_already_taken' }` |

### AuthGuard

| Case | Exception |
|------|-----------|
| Header absent on org-required route | `403 ForbiddenException { error: 'organization_context_required' }` |
| Account not a member of org | `403 ForbiddenException { error: 'not_a_member' }` |
| Org does not exist | `403 ForbiddenException { error: 'not_a_member' }` (same — do not reveal existence) |

### Invitations

| Case | Exception |
|------|-----------|
| Invalid or expired token | `400 BadRequestException { error: 'invalid_invitation' }` |
| Already a member | `409 ConflictException { error: 'already_a_member' }` |
| Org membership cap reached (5) | `422 UnprocessableEntityException { error: 'organization_limit_reached' }` |

---

## Testing Strategy

All tests use `InMemoryOrganizationRepository` — no Prisma or Redis mocks.

### `organizations.service.spec.ts`

- `getMyOrganization` — found / not a member
- `updateOrganization` — success / unauthorized role
- `listMembers` — returns members scoped to active org
- `createInvitation` — returns signed token with correct fields
- `acceptInvitation`:
  - existing account → membership added → tokens issued
  - new account → account + membership created → tokens issued
  - expired/invalid token → 400
  - already a member → 409
  - cap reached → 422

### `auth.service.spec.ts` (updates)

- `register` — creates account + org sequentially / slug conflict / email conflict

### `auth.guard.spec.ts` (updates)

- Header absent on protected route → 403 `organization_context_required`
- Header with non-member org → 403 `not_a_member`
- Valid header → full `AuthContext` populated

---

## Out of Scope

- Branch management endpoints (future module)
- Email delivery (invitation URL returned to frontend, email sending deferred)
- DB transaction wrapping register flow (see `docs/decisions/deferred-transactions.md`)
- Revoking or listing pending invitations (no invitation table in this iteration)
