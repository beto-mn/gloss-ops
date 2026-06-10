## ADDED Requirements

### Requirement: Stories for service-drawer and work-order-edit-drawer

`service-drawer.tsx` and `work-order-edit-drawer.tsx` SHALL each have a colocated `.stories.tsx` file exporting at minimum: `HappyPath`, `ValidationError`, `ServerError`, and `LoadingState` story variants.

#### Scenario: ServiceDrawer happy path story

- **WHEN** the `HappyPath` story renders and play() fills all required fields and clicks submit
- **THEN** the MSW handler intercepts the POST and returns 201; the drawer closes or a success indicator is visible

#### Scenario: ServiceDrawer validation error story

- **WHEN** the `ValidationError` story renders and play() clicks submit without filling required fields
- **THEN** inline validation messages are visible for each required field without a network request being made

#### Scenario: ServiceDrawer server error story

- **WHEN** the `ServerError` story renders and play() fills valid data and submits
- **THEN** the MSW handler returns a 422 or 500 response; an error message is visible in the UI

#### Scenario: ServiceDrawer loading state story

- **WHEN** the `LoadingState` story renders with a delayed MSW handler
- **THEN** the submit button is disabled or a loading indicator is visible while the request is in-flight

#### Scenario: WorkOrderEditDrawer happy path story

- **WHEN** the `HappyPath` story renders pre-filled with fixture data and play() submits
- **THEN** the MSW handler intercepts the PATCH and returns 200; the drawer closes or success is shown

#### Scenario: WorkOrderEditDrawer validation error story

- **WHEN** the `ValidationError` story renders and play() clears a required field and submits
- **THEN** the inline validation message for that field is visible

#### Scenario: WorkOrderEditDrawer server error story

- **WHEN** the `ServerError` story renders and play() submits valid data
- **THEN** the MSW handler returns 500; an error message is shown

---

### Requirement: Upgraded play() coverage on existing stories

Stories that already have `play()` functions SHALL be upgraded to cover all four states: happy path, validation error, server error, and loading state, unless a state is architecturally impossible for that component.

Affected files: `customer-drawer.stories.tsx`, `vehicle-drawer.stories.tsx`, `login-form.stories.tsx`, `register-form.stories.tsx`.

#### Scenario: customer-drawer happy path play() fills and submits

- **WHEN** the `Create` story's play() runs
- **THEN** it types valid values into all required fields, clicks the submit button, and asserts the success outcome (drawer closes or success toast shown)

#### Scenario: customer-drawer validation error play() triggers inline messages

- **WHEN** a `ValidationError` story's play() clicks submit without filling required fields
- **THEN** at least one inline validation error message becomes visible

#### Scenario: customer-drawer server error play() shows error feedback

- **WHEN** a `ServerError` story's play() submits valid data against a 500 MSW handler
- **THEN** an error message or alert is visible

#### Scenario: login-form happy path play() fills credentials and submits

- **WHEN** the `Default` story's play() fills email and password and clicks submit
- **THEN** the form submits without visible validation errors

#### Scenario: login-form validation error play() shows field errors

- **WHEN** a `ValidationError` story's play() submits with an invalid email format
- **THEN** an inline validation error for the email field is visible

---

### Requirement: Play() functions use userEvent for interactions

All `play()` functions SHALL use `@storybook/test`'s `userEvent` (or compatible API) to simulate real user input rather than directly mutating DOM values.

#### Scenario: play() fills input with userEvent.type

- **WHEN** a play() function needs to enter text into an input field
- **THEN** it calls `await userEvent.type(input, 'value')` (not `input.value = 'value'`)

#### Scenario: play() submits form with userEvent.click

- **WHEN** a play() function needs to submit a form
- **THEN** it calls `await userEvent.click(submitButton)` rather than calling `.submit()` directly
