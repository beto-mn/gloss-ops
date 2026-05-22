# Design: Organizations Module

## Context

After `POST /auth/register` created only an `Account`, the caller's `AuthContext` always had `organizationId: null` and `role: null`. There was no mechanism to onboard a shop, invite team members, or resolve which org a request was acting on behalf of. The JWT previously carried `memberId` inline, which became insufficient for multi-org accounts.

## Goals

- Integrate org creation into the registration flow so new accounts are immediately owners of a shop
- Resolve org context per-request from the `X-Organization-Id` header rather than baking it into the token
- Build `GET /organizations`, `GET /organizations/me`, `PATCH /organizations/me`, `GET /organizations/me/members`, `POST /organizations/invitations`, and `POST /organizations/invitations/accept`
- Support up to 5 org memberships per account with different roles in each

## Non-Goals

- Branch management endpoints (future module)
- Email delivery for invitations (URL returned to frontend; email sending deferred to a queue)
- DB transaction wrapping the register flow (sequential calls accepted for MVP; see deferred-transactions.md)
- Revoking pending invitations via API (Redis key can be deleted manually; endpoint deferred)
- Listing pending invitations (no invitation table — only Redis keys with TTL)

## Decisions

| Decision                   | Choice                                         | Reason                                                                                      |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| JWT payload simplification | `{ sub, email }` replacing `{ sub, memberId }` | Multi-org accounts cannot have a single memberId; org context belongs in the request header |
| Org context resolution     | `X-Organization-Id` header per request         | Stateless, explicit, and supports accounts belonging to multiple orgs simultaneously        |
| Invitation storage         | Redis UUID tokens with configurable TTL        | No invitation table needed; automatic expiry; simple revocation by deleting the key         |
| Invitation single-use      | Delete token after successful accept           | Prevents replay; a failed accept leaves the token valid for retry                           |
| Org membership cap         | Hard limit of 5 orgs per account               | Prevents runaway data growth at MVP scale                                                   |

## Risks / Trade-offs

- Sequential register flow (Account → Org → Branch → Member) is not wrapped in a transaction — a failure between steps could leave an orphaned Account; accepted for MVP, documented in deferred-transactions.md
- `AuthModule` and `OrganizationsModule` have a mutual dependency resolved via `forwardRef` — this is a NestJS-supported pattern but adds complexity; refactoring to extract a shared module is a future option
