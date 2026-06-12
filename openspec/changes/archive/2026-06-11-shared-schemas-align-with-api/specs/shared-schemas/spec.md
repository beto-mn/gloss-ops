## MODIFIED Requirements

### Requirement: Entity response schemas exported

`@glossops/shared` SHALL export a Zod schema and a corresponding TypeScript type for each successful response shape returned by `apps/api`. Each schema MUST parse the actual API payload without throwing.

The published surface SHALL include, at minimum:

- **Domain entity schemas** (existing): `Customer`, `CustomerListItem`, `CustomerAsset`, `WorkOrder`, `WorkOrderListItem`, `WorkOrderDetail`, `WorkOrderItem`, `AssetCheckpoint`, `Service`, `Supplier`, `Brand`, `Branch`, `Organization`, `InventoryItem`, `PurchaseOrder`, `Warranty`, `Invoice`, `ActivityLog`.
- **New auth schemas**: `AuthTokens` (`accessToken`, `refreshToken`, `expiresIn`).
- **New organization-related schemas**: `OrganizationWithRole` (Organization plus the caller's role), `MemberWithAccount` (membership row joined with account fields), `InvitationCreated` (response of the invitation-creation endpoint).
- **New work-order schemas**: `WorkOrderAssignmentResponse` (the flat shape the controller returns, distinct from the existing nested `WorkOrderAssignment`), `WorkOrderCreateResponse` (the create endpoint's response shape when it differs from the detail).
- **New inventory schema**: `InventoryUsage` for `GET /inventory/:id/usages`.
- **Page wrappers**: a `Page` schema for every paginated list endpoint, generated via the factory described in the new "Generic page schema factory" requirement.

#### Scenario: Schema parses every successful API response

- **WHEN** any successful 2xx response from `apps/api` is parsed with its published schema
- **THEN** `schema.parse(response.body)` returns without throwing and produces a value typed via `z.infer<typeof Schema>`

#### Scenario: Schema rejects invalid response

- **WHEN** a JSON object with missing required fields or wrong types is parsed
- **THEN** `schema.parse(object)` throws a `ZodError`

#### Scenario: Every e2e suite parses through published schemas

- **WHEN** the file contents under `apps/api/test/*.e2e-spec.ts` are inspected
- **THEN** zero occurrences of the string `no shared schema yet` exist, AND zero `interface ...Response` declarations exist inside e2e spec files, AND every successful response asserted by a suite is parsed via `parseWith(<published schema>)`

## ADDED Requirements

### Requirement: Decimal fields use coercion

Every field that maps to a Prisma `Decimal` (e.g., `subtotal`, `tax`, `taxRate`, `taxAmount`, `total`, `unitPrice`, quantities expressed as fractions of a roll) SHALL be declared in `@glossops/shared` as `z.coerce.number()`. The runtime SHALL accept both numeric and string inputs; the inferred TypeScript type SHALL be `number`.

#### Scenario: Decimal serialized as string is accepted

- **WHEN** the API returns a Decimal field as a JSON string (e.g., `"1234.56"`)
- **THEN** the schema parses it without throwing and the parsed value is a JavaScript `number`

#### Scenario: Decimal serialized as number is accepted

- **WHEN** the API returns a Decimal field as a JSON number
- **THEN** the schema parses it without throwing and the parsed value is the same JavaScript `number`

#### Scenario: Non-numeric string is rejected

- **WHEN** the API returns a Decimal field as a non-numeric string (e.g., `"abc"`)
- **THEN** the schema rejects the response with a `ZodError`

### Requirement: Generic page schema factory

`@glossops/shared` SHALL export a `createPageSchema` factory that, given an item schema, returns a Zod object schema with the shape `{ data: z.array(item), total: z.number(), page: z.number(), limit: z.number() }`. Every paginated list endpoint in the API SHALL have a published page schema generated via this factory.

#### Scenario: Factory composes per entity

- **WHEN** `createPageSchema(CustomerListItemSchema)` is called
- **THEN** the result is a Zod schema that parses `{ data: [valid CustomerListItem...], total, page, limit }` without throwing

#### Scenario: Page schema rejects missing pagination metadata

- **WHEN** a JSON object is missing `total`, `page`, or `limit`
- **THEN** the page schema throws a `ZodError`

#### Scenario: Page schema rejects items that fail item schema

- **WHEN** the `data` array contains an item that does not match the item schema
- **THEN** the page schema throws a `ZodError` whose issue path points into `data[N]`

### Requirement: Schema variants per endpoint shape

When `GET /entity` (list), `GET /entity/:id` (detail), and `POST /entity` (create) return materially different shapes for the same entity, each variant SHALL be published as its own schema. The naming convention is `<Entity>ListItemSchema`, `<Entity>DetailSchema`, and `<Entity>CreateResponseSchema`. The existing `<Entity>Schema` SHALL remain as an alias for the detail variant when one already exists, to preserve `apps/web` imports.

#### Scenario: List variant matches list payload

- **WHEN** `GET /entity` is called and the response is parsed through `<Entity>ListItemSchema` via the page wrapper
- **THEN** parsing succeeds without throwing

#### Scenario: Detail variant matches detail payload

- **WHEN** `GET /entity/:id` is called and the response is parsed through `<Entity>DetailSchema`
- **THEN** parsing succeeds without throwing

#### Scenario: Create variant matches create payload

- **WHEN** `POST /entity` is called and the response is parsed through `<Entity>CreateResponseSchema`
- **THEN** parsing succeeds without throwing, even if the response is narrower than `<Entity>DetailSchema` (e.g., the create response lacks computed fields like `activeWorkOrderCount`)

### Requirement: No source-of-truth drift after this change

After this change is archived, the file contents under `apps/api/test/*.e2e-spec.ts` SHALL NOT contain any of: the string `no shared schema yet`, any local `interface ...Response` declaration, or any 2xx response asserted via `expect.objectContaining(...)` instead of `parseWith(<schema>)`.

#### Scenario: Grep gate for residual workarounds

- **WHEN** the working tree is grepped for `no shared schema yet` under `apps/api/test/`
- **THEN** zero matches are returned

#### Scenario: No local response interfaces in e2e files

- **WHEN** the working tree is grepped for `^interface\s+\w+Response` under `apps/api/test/*.e2e-spec.ts`
- **THEN** zero matches are returned
