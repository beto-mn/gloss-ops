# Spec: Web Auth

## Purpose

This spec covers the web authentication capability for GlossOps. It defines the behaviour of the login and register pages, client-side validation, token storage, sign-out flow, automatic token refresh, design system compliance, and Storybook story requirements for both auth form components.

---

### Requirement: Login form renders email and password fields

The login page SHALL render an email input, a password input with show/hide toggle, and a submit button. All fields SHALL have visible labels (not placeholder-only).

#### Scenario: Form renders correctly on page load

- **WHEN** user navigates to `/login`
- **THEN** email input, password input, and submit button are visible
- **THEN** password field is masked by default with a show/hide toggle icon

### Requirement: Client-side validation before submit (login)

The login form SHALL validate inputs with Zod before making any network call. Email SHALL match valid email format. Password SHALL be at least 8 characters.

#### Scenario: Invalid email blocks submit

- **WHEN** user enters a non-email string in the email field and submits
- **THEN** an inline error message appears below the email field
- **THEN** no network request is made

#### Scenario: Short password blocks submit

- **WHEN** user enters fewer than 8 characters in the password field and submits
- **THEN** an inline error message appears below the password field
- **THEN** no network request is made

#### Scenario: Valid inputs allow submit

- **WHEN** user enters a valid email and a password of 8+ characters
- **THEN** the form submits and a network request is made to `POST /auth/login`

### Requirement: Loading state during login request

The form SHALL enter a loading state while the login request is in flight.

#### Scenario: Submit button shows loading indicator

- **WHEN** the login request is pending
- **THEN** the submit button is disabled and displays a spinner
- **THEN** both inputs are disabled

### Requirement: Error feedback on failed login

The form SHALL display an error message when the API returns 401 or any error response. The password field SHALL be cleared.

#### Scenario: Invalid credentials error

- **WHEN** the API returns a 401 response
- **THEN** an error message is displayed below the form (not in a toast)
- **THEN** the password field is cleared
- **THEN** the email field retains its value and receives focus

#### Scenario: Network or server error

- **WHEN** the API returns a 5xx response or the request times out
- **THEN** a generic error message is displayed below the form
- **THEN** the submit button is re-enabled

### Requirement: Successful login stores tokens and redirects

On a successful `POST /auth/login` response, the system SHALL store both tokens and redirect the user.

#### Scenario: Successful login redirect

- **WHEN** the API returns a 200 response with `{ accessToken, refreshToken }`
- **THEN** `accessToken` is stored in `localStorage` under the key `gloss_access_token`
- **THEN** `refreshToken` is stored in `localStorage` under the key `gloss_refresh_token`
- **THEN** the user is redirected to `/dashboard`

### Requirement: Register form renders all required fields

The register page SHALL render name, email, org name, password, and confirm password inputs. All fields SHALL have visible labels.

#### Scenario: Form renders correctly on page load

- **WHEN** user navigates to `/register`
- **THEN** name, email, org name, password, and confirm password inputs are visible
- **THEN** both password fields are masked with show/hide toggles

### Requirement: Client-side validation before submit (register)

The register form SHALL validate all inputs with Zod before making any network call.

#### Scenario: Name too short blocks submit

- **WHEN** user enters fewer than 2 characters in the name field and submits
- **THEN** an inline error message appears below the name field
- **THEN** no network request is made

#### Scenario: Org name too short blocks submit

- **WHEN** user enters fewer than 2 characters in the org name field and submits
- **THEN** an inline error message appears below the org name field
- **THEN** no network request is made

#### Scenario: Passwords do not match

- **WHEN** user enters different values in password and confirm password and submits
- **THEN** an inline error message appears below the confirm password field
- **THEN** no network request is made

#### Scenario: Valid inputs allow submit

- **WHEN** all fields pass validation
- **THEN** the form submits and a network request is made to `POST /auth/register`

### Requirement: Successful register stores tokens and redirects

On a successful `POST /auth/register` response, the system SHALL store both tokens and redirect the user.

#### Scenario: Successful register redirect

- **WHEN** the API returns a 200 response with `{ accessToken, refreshToken }`
- **THEN** `accessToken` is stored in `localStorage` under `gloss_access_token`
- **THEN** `refreshToken` is stored in `localStorage` under `gloss_refresh_token`
- **THEN** the user is redirected to `/dashboard`

### Requirement: Sign out clears tokens and invalidates session

The sign out action SHALL call `POST /auth/logout`, clear both tokens, and redirect to `/login`. It SHALL complete even if the logout request fails.

#### Scenario: Successful sign out

- **WHEN** user triggers sign out
- **THEN** `POST /auth/logout` is called with the stored refresh token
- **THEN** both `gloss_access_token` and `gloss_refresh_token` are removed from `localStorage`
- **THEN** the user is redirected to `/login`

#### Scenario: Sign out on network failure (optimistic)

- **WHEN** user triggers sign out and the `POST /auth/logout` request fails
- **THEN** both tokens are still removed from `localStorage`
- **THEN** the user is still redirected to `/login`

### Requirement: Automatic token refresh on 401

The HTTP client SHALL transparently refresh the access token when a protected request returns 401 and retry the original request once.

#### Scenario: Access token expired, refresh succeeds

- **WHEN** a protected request returns 401
- **AND** the stored refresh token is valid
- **THEN** the client calls `POST /auth/refresh` with the refresh token
- **THEN** both new tokens are stored in `localStorage`
- **THEN** the original request is retried with the new access token
- **THEN** the caller receives the successful response as if no 401 occurred

#### Scenario: Refresh token expired or invalid

- **WHEN** a protected request returns 401
- **AND** `POST /auth/refresh` returns 401 with `invalid_refresh_token`
- **THEN** both tokens are removed from `localStorage`
- **THEN** the user is redirected to `/login`

### Requirement: Auth pages use Gulf Racing design system

Both auth pages SHALL follow `design-system/glossops/MASTER.md` tokens. Page-level overrides SHALL be documented at `design-system/glossops/pages/auth.md`.

#### Scenario: Light mode renders correctly

- **WHEN** the system theme is light
- **THEN** the page background uses `--background` (`#F5F8FA`) and the card uses `--card` (`#FFFFFF`)
- **THEN** submit buttons use `--primary` (`#F06432`) with white text

#### Scenario: Dark mode renders correctly

- **WHEN** the system theme is dark
- **THEN** the page background uses `--background` (`#0F1C23`) and the card uses `--card` (`#1A2730`)
- **THEN** submit buttons use `--primary` (`#F06432`) with white text

### Requirement: Auth form components have Storybook stories

`LoginForm` and `RegisterForm` SHALL each have a colocated `.stories.tsx` file with at least three stories.

#### Scenario: Storybook stories exist

- **WHEN** Storybook is running
- **THEN** stories for `Default`, `Loading`, and `WithError` are available under `Auth/LoginForm`
- **THEN** stories for `Default`, `Loading`, and `WithError` are available under `Auth/RegisterForm`
