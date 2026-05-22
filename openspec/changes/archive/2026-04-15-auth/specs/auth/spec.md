# Spec: auth

## ADDED Requirements

### Requirement: Registration creates an account and returns tokens

A `POST /auth/register` request SHALL create a new `Account` and return an access/refresh token pair with null membership claims when the email is not yet registered.

#### Scenario: Happy path registration

- **WHEN** a client sends a valid `RegisterDto` with a unique email
- **THEN** a new `Account` is persisted, tokens are issued, and the response contains `{ accessToken, refreshToken, expiresIn: 900 }`

#### Scenario: Duplicate email

- **WHEN** a client sends a `RegisterDto` with an email that already exists
- **THEN** the API returns `409` with `{ error: 'email_already_registered' }`

---

### Requirement: Login validates credentials and returns tokens

A `POST /auth/login` request SHALL return a token pair when credentials are valid and SHALL reject with `401` when they are not.

#### Scenario: Valid credentials

- **WHEN** a client sends correct email and password
- **THEN** the API returns `200` with `{ accessToken, refreshToken, expiresIn: 900 }`

#### Scenario: Invalid credentials

- **WHEN** a client sends an unknown email or wrong password
- **THEN** the API returns `401` with `{ error: 'invalid_credentials' }`

---

### Requirement: Refresh token rotation issues new tokens and invalidates the old one

A `POST /auth/refresh` request MUST delete the supplied refresh token from Redis and issue a new token pair.

#### Scenario: Valid refresh token

- **WHEN** a client sends a known, unexpired refresh token
- **THEN** the API returns a new token pair and the old refresh token is no longer valid

#### Scenario: Invalid or expired refresh token

- **WHEN** a client sends an unknown or expired refresh token
- **THEN** the API returns `401` with `{ error: 'invalid_refresh_token' }`

---

### Requirement: Logout deletes the refresh token

A `POST /auth/logout` request MUST delete the caller's refresh token from Redis so it cannot be reused.

#### Scenario: Successful logout

- **WHEN** an authenticated account sends a valid refresh token
- **THEN** the refresh token is deleted and subsequent refresh attempts return `401`

---

### Requirement: AuthGuard enforces authentication globally

Every route MUST require a valid Bearer token unless decorated with `@Public()`.

#### Scenario: Missing token on protected route

- **WHEN** a request arrives without an `Authorization` header on a non-public route
- **THEN** the API returns `401 Unauthorized`

#### Scenario: Public route bypasses the guard

- **WHEN** a request arrives on a route decorated with `@Public()`
- **THEN** the request proceeds without a token

---

### Requirement: RolesGuard enforces role-based access

Routes decorated with `@Roles(...)` MUST reject callers whose role does not match.

#### Scenario: Insufficient role

- **WHEN** a caller with role `TECHNICIAN` accesses a route requiring `OWNER`
- **THEN** the API returns `403` with `{ error: 'insufficient_role' }`

#### Scenario: No membership

- **WHEN** a caller with no org membership accesses a role-restricted route
- **THEN** the API returns `403` with `{ error: 'no_membership' }`
