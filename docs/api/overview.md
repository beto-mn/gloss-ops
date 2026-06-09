# API Overview

> NestJS REST API — interactive docs at `/docs` (Swagger UI, neon dark theme).

## Base URL

```
http://localhost:3000   (local dev)
```

## Authentication

All endpoints require a valid JWT access token unless decorated with `@Public()`.

```
Authorization: Bearer <access_token>
```

Token lifecycle:

- `POST /auth/login` → returns `{ accessToken, refreshToken }`
- `POST /auth/refresh` → rotates the refresh token, returns a new pair
- `POST /auth/logout` → revokes the refresh token from Redis
- Access token lifetime: configured via `JWT_ACCESS_EXPIRES_IN_SECONDS`
- Refresh tokens are stored in Redis with TTL

## RBAC

Role is read from `OrganizationMember.role` on every request. Available roles:

| Role         | Typical permissions                        |
| ------------ | ------------------------------------------ |
| `OWNER`      | Full access including delete and admin ops |
| `MANAGER`    | Operational access, no org-level admin     |
| `TECHNICIAN` | Read + update assigned work orders         |
| `FRONT_DESK` | Customer and work order intake             |

Routes use `@Roles(Role.OWNER, Role.MANAGER)` to restrict access.

## Multi-tenancy

Every request is scoped to the authenticated member's branch and organization:

```ts
// Extracted from the JWT and attached to req by AuthGuard
interface AuthContext {
  sub: string // accountId
  memberId: string
  email: string
  branchId: string
  organizationId: string
  role: Role
}
```

All queries filter by `organizationId` (or derive it via `branchId → branch.organizationId`).

## Pagination

List endpoints accept:

| Query param | Type   | Default | Description           |
| ----------- | ------ | ------- | --------------------- |
| `page`      | number | 1       | Page number (1-based) |
| `limit`     | number | 20      | Items per page        |

Response envelope:

```json
{
  "data": [...],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
}
```

## Error format

```json
{
  "statusCode": 404,
  "message": "Customer not found",
  "error": "Not Found"
}
```

Validation errors (`400`) return an array of messages:

```json
{
  "statusCode": 400,
  "message": ["name must be a string", "email must be an email"],
  "error": "Bad Request"
}
```

## Soft delete

Resources with `status` support soft delete via `DELETE /:id`. Hard delete requires `?permanent=true` and `OWNER` role.

| Status    | Meaning                         |
| --------- | ------------------------------- |
| `ACTIVE`  | Normal state                    |
| `DELETED` | Soft deleted, hidden from lists |

## Common ID param

All `/:id` params expect a valid UUID. Non-UUID values return `400 Bad Request`.
