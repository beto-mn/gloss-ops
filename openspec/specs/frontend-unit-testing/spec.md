## ADDED Requirements

### Requirement: Vitest unit project in apps/web

`vitest.config.ts` in `apps/web` SHALL define a `unit` project that:

- Runs in a `happy-dom` environment.
- Resolves path aliases (`@/*` → `src/*`) using `vite-tsconfig-paths` or an explicit `resolve.alias` mapping.
- Does NOT use a browser or Playwright provider.

#### Scenario: unit project is isolated from storybook project

- **WHEN** `pnpm --filter web test` is executed
- **THEN** only the `unit` project runs (storybook/Playwright project is excluded)

#### Scenario: vitest config defines both projects

- **WHEN** `vitest.config.ts` is read
- **THEN** it SHALL contain a `projects` array with both a `unit` project (happy-dom) and the existing `storybook` project (playwright)

---

### Requirement: test script in apps/web package.json

`apps/web/package.json` SHALL expose a `test` script that runs the `unit` vitest project.

#### Scenario: test script exits zero on passing tests

- **WHEN** `pnpm --filter web test` is run with all unit tests passing
- **THEN** the process exits with code 0

#### Scenario: test script exits non-zero on failure

- **WHEN** any unit test fails
- **THEN** the process exits with a non-zero code

---

### Requirement: Hook unit tests with mocked apiFetch

Every hook file under `apps/web/src/hooks/` SHALL have a corresponding unit test file that mocks `apiFetch` via `vi.mock('@/lib/api-client')` and verifies the hook's behavior.

#### Scenario: hook returns data on successful fetch

- **WHEN** `apiFetch` mock resolves with a valid payload
- **THEN** the hook returns `data` matching the resolved payload and `isLoading: false`

#### Scenario: hook exposes error state on fetch failure

- **WHEN** `apiFetch` mock rejects with an `ApiError`
- **THEN** the hook returns `isError: true` and `error.status` matching the mocked status

#### Scenario: mutation hook calls apiFetch with correct args

- **WHEN** a mutation hook's `mutate` function is called with input data
- **THEN** `apiFetch` is called once with the expected path and `RequestInit` body

---

### Requirement: Zod schema unit tests

Every Zod schema file under `apps/web/src/lib/schemas/` SHALL have a corresponding unit test that verifies parse behavior.

#### Scenario: schema parses valid input

- **WHEN** `schema.parse(validInput)` is called with a conforming object
- **THEN** it returns the parsed value without throwing

#### Scenario: schema rejects invalid input

- **WHEN** `schema.parse(invalidInput)` is called with a non-conforming object
- **THEN** it throws a `ZodError` with at least one issue

---

### Requirement: apiFetch error boundary unit tests

`apps/web/src/lib/api-client.ts` SHALL have a dedicated unit test file that verifies the 401 token-refresh fallback and network error paths directly, mocking the global `fetch`.

#### Scenario: 401 with valid refresh token retries original request

- **WHEN** `apiFetch` receives a 401 response and a refresh token exists in storage
- **THEN** it calls the `/auth/refresh` endpoint, stores the new tokens, retries the original request with the new access token, and returns the retried response

#### Scenario: 401 with failed refresh redirects to login

- **WHEN** `apiFetch` receives a 401 response and the `/auth/refresh` call returns a non-OK response
- **THEN** `clearTokens()` is called and the function rejects with an `ApiError(401)`

#### Scenario: 401 with no refresh token throws immediately

- **WHEN** `apiFetch` receives a 401 response and no refresh token exists in storage
- **THEN** it throws an `ApiError` with `status: 401` without attempting a refresh

#### Scenario: network error propagates as rejection

- **WHEN** the global `fetch` throws a network-level error (e.g., `TypeError: Failed to fetch`)
- **THEN** `apiFetch` rejects with that error (does not swallow it)

---

### Requirement: Utility function unit tests

`apps/web/src/lib/utils.ts` SHALL have unit tests covering each exported function.

#### Scenario: cn() merges class names

- **WHEN** `cn('foo', 'bar', { baz: true, qux: false })` is called
- **THEN** it returns `'foo bar baz'`

#### Scenario: cn() deduplicates Tailwind classes

- **WHEN** conflicting Tailwind utility classes are passed (e.g., `'p-2'` and `'p-4'`)
- **THEN** the last class wins per Tailwind Merge rules
