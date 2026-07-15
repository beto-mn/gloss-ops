# API Request Validation Migration: Class-Validator to Zod

## Executive Summary

Migration of request validation from NestJS class-validator decorators to Zod schemas, with single source of truth in `@glossops/shared` package. Current state: 49 `.dto.ts` files across 16 feature modules using class-validator + @nestjs/swagger decorators. Zod already integrated in shared package (v3.24.2) with 17+ response schemas. No existing zod-to-openapi integration found.

---

## 1. API DTOs

### Directory Structure

16 feature modules with `dto/` directories under `apps/api/src/`:

- `apps/api/src/activity-logs/dto/`
- `apps/api/src/asset-checkpoints/dto/`
- `apps/api/src/auth/dto/`
- `apps/api/src/branches/dto/`
- `apps/api/src/brands/dto/`
- `apps/api/src/customer-assets/dto/`
- `apps/api/src/customers/dto/`
- `apps/api/src/inventory/dto/`
- `apps/api/src/invoices/dto/`
- `apps/api/src/organizations/dto/`
- `apps/api/src/purchase-orders/dto/`
- `apps/api/src/services/dto/`
- `apps/api/src/suppliers/dto/`
- `apps/api/src/warranties/dto/`
- `apps/api/src/work-order-assignments/dto/`
- `apps/api/src/work-orders/dto/`

### DTO Count

**Total: 49 `.dto.ts` files**

### Representative Examples

#### Create DTO (Simple)

**File:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/apps/api/src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'owner@glossops.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'supersecret123' })
  @IsString()
  password: string
}
```

#### Create DTO (Complex with Validation)

**File:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/apps/api/src/customers/dto/create-customer.dto.ts`

```typescript
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'

export class CreateCustomerDto {
  @ApiProperty({ example: 'John', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @ApiProperty({ example: 'Doe', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @ApiPropertyOptional({ example: 'john@example.com', maxLength: 254 })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string

  // ... 6 more optional fields with similar pattern
}
```

#### Update DTO with PartialType

**File:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/apps/api/src/branches/dto/update-branch.dto.ts`

```typescript
import { PartialType } from '@nestjs/swagger'
import { CreateBranchDto } from './create-branch.dto'

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
```

#### List DTO with @Type and @Transform

**File:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/apps/api/src/customers/dto/list-customers.dto.ts`

```typescript
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class ListCustomersDto {
  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE', 'ALL'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: CustomerStatusFilter

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number) // <-- class-transformer coercion
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
```

### Decorator Usage Patterns

- **@ApiProperty / @ApiPropertyOptional**: Swagger/OpenAPI metadata (26+ usages across DTOs)
- **@IsOptional()**: Marks fields as optional (57+ usages)
- **@IsString()**: String type validation (48+ usages)
- **@MaxLength() / @MinLength()**: String length constraints (45+ usages)
- **@Type(() => T)**: class-transformer type coercion (19 usages, mostly `@Type(() => Number)` for pagination)
- **@Transform({ value })**: Custom field transformation (2 usages, e.g. boolean coercion in inventory)
- **@IsEmail()**: Email validation (4 usages)
- **@IsInt()**: Integer validation (6 usages)
- **@IsIn([])**: Enum validation (5+ usages)
- **PartialType(BaseDto)**: Used in update DTOs (2 confirmed: branches, customer-assets)

---

## 2. Validation Wiring

### Configuration Location

**File:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/apps/api/src/main.ts` (lines 98)

### ValidationPipe Setup

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: envs.app.frontendUrl, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  // ... swagger setup
  await app.listen(envs.port)
}
```

### Current Config

- **Pipe:** `ValidationPipe` from `@nestjs/common`
- **whitelist: true** – Strips unknown properties from DTOs
- **No transform: true** – Note: class-transformer coercion via @Type works separately
- **No forbidNonWhitelisted** – Unknown props silently removed, no error raised
- **No skipMissingProperties** – All decorators checked

---

## 3. Swagger / OpenAPI Setup

### Configuration

**File:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/apps/api/src/main.ts` (lines 100–111)

```typescript
const config = new DocumentBuilder()
  .setTitle('GlossOps API')
  .setDescription('Documentación interna de la API')
  .setVersion('1.0')
  .addBearerAuth()
  .build()

const document = SwaggerModule.createDocument(app, config)
SwaggerModule.setup('api-docs', app, document, {
  customCss: DARK_CSS,
  customSiteTitle: 'GlossOps API',
})
```

### Dependency Chain

- **Swagger Module:** `@nestjs/swagger` v11.4.2
- **Metadata Source:** Class-validator + class-transformer decorators
  - `@ApiProperty`, `@ApiPropertyOptional` map directly to OpenAPI schema
  - `@Type`, `@Transform` influence swagger metadata generation
- **No explicit zod-to-openapi:** Currently relying on NestJS Swagger's built-in DTO reflection

### Swagger Endpoint

- URL: `/api-docs`
- Dark theme CSS included in main.ts (lines 11–93)
- Bearer auth enabled

---

## 4. Shared Package Structure

### Location & Organization

**Root:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/packages/shared/src/`

```
packages/shared/src/
├── dto/
│   ├── id-param.dto.ts
│   ├── pagination.dto.ts
│   └── index.ts
├── schemas/  (17+ Zod response schemas)
│   ├── activity-log.ts
│   ├── asset-checkpoint.ts
│   ├── auth.ts
│   ├── branch.ts
│   ├── brand.ts
│   ├── customer.ts
│   ├── customer-asset.ts
│   ├── invoice.ts
│   ├── inventory-usage.ts
│   ├── inventory.ts
│   ├── organization.ts
│   ├── pagination.ts
│   ├── purchase-order.ts
│   ├── service.ts
│   ├── supplier.ts
│   ├── warranty.ts
│   ├── work-order-assignment.ts
│   ├── work-order.ts
│   └── index.ts
├── enums.ts
└── index.ts
```

### Existing Zod Organization

**Response Schemas (feat 33):** Already defined in `/packages/shared/src/schemas/` with consistent pattern:

- Schema definition: `export const CustomerSchema = z.object({ ... })`
- Type inference: `export type Customer = z.infer<typeof CustomerSchema>`
- Page variants: `export const CustomerPageSchema = createPageSchema(...)`
- Barrel export in `index.ts` (both schema objects and type aliases)

**Example:** `packages/shared/src/schemas/customer.ts`

```typescript
export const CustomerSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  // ... 8 more fields
})

export const CustomerCreateResponseSchema = CustomerSchema
export const CustomerListItemSchema = CustomerSchema.extend({
  activeWorkOrderCount: z.number(),
})
export const CustomerPageSchema = createPageSchema(CustomerListItemSchema)

export type Customer = z.infer<typeof CustomerSchema>
export type CustomerCreateResponse = z.infer<
  typeof CustomerCreateResponseSchema
>
export type CustomerListItem = z.infer<typeof CustomerListItemSchema>
export type CustomerPage = z.infer<typeof CustomerPageSchema>
```

### Existing DTO Namespace

**Location:** `/packages/shared/src/dto/`

- Currently holds shared DTOs: `PaginationDto`, `IdParamDto`
- Both have Zod equivalents: `PaginationSchema`, `IdParamSchema`
- Barrel export in `dto/index.ts`

### Request-Schemas Namespace

**Status:** Does not exist yet
**Proposed location:** `/packages/shared/src/request-schemas/` (parallel to existing `schemas/` and `dto/`)

### Barrel Export Organization

**File:** `/packages/shared/src/index.ts`

```typescript
export type { PaginationDto } from './dto'
export { PaginationSchema } from './dto'
export type { IdParamDto } from './dto'
export { IdParamSchema } from './dto'
export * from './schemas'
export * from './enums'
```

Recommended addition:

```typescript
export * from './request-schemas' // New namespace
```

### Package Configuration

**Package Name:** `@glossops/shared` (workspace:\*)

**package.json:**

- **Zod:** `^3.24.2` (already present)
- **Node target:** ES2023
- **Module system:** nodenext

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "ES2023",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Build:** `tsc --project tsconfig.json` (with watch option available)

---

## 5. Web Form Schemas

### Directory & Files

**Location:** `/Users/betonajera/Workspaces/BetoNajera/gloss-ops/apps/web/src/lib/schemas/`

**14 files total:**

- `auth.schema.ts` + `.test.ts`
- `customer.schema.ts` + `.test.ts`
- `customer-asset.schema.ts` + `.test.ts`
- `invoice.schema.ts` + `.test.ts`
- `service.schema.ts` + `.test.ts`
- `warranty.schema.ts` + `.test.ts`
- `work-order.schema.ts` + `.test.ts`

### Example 1: Auth Schema

**File:** `/apps/web/src/lib/schemas/auth.schema.ts`

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Ingresa un correo válido'),
    orgName: z.string().min(2, '...'),
    password: z.string().min(8, '...'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
```

### Example 2: Customer Schema

**File:** `/apps/web/src/lib/schemas/customer.schema.ts`

```typescript
export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  taxId: z.string().max(20).optional().or(z.literal('')),
  fiscalRegime: z.string().max(100).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
  source: z.string().max(50).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
})

export type CreateCustomerValues = z.infer<typeof createCustomerSchema>
export const updateCustomerSchema = createCustomerSchema.partial()
export type UpdateCustomerValues = z.infer<typeof updateCustomerSchema>
```

### Form Component Integration

**Form Consumer Example:**
**File:** `/apps/web/src/components/customers/customer-drawer.tsx`

```typescript
import { createCustomerSchema } from '@/lib/schemas/customer.schema'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Usage:
const form = useForm({
  resolver: zodResolver(createCustomerSchema),
  // ...
})
```

### Pattern: z.infer + hookform zodResolver

- **z.infer<typeof schema>** – Extracts TypeScript types from Zod schemas
- **zodResolver** from `@hookform/resolvers/zod` – Bridges react-hook-form and Zod validation
- Each schema has companion types exported for form values

---

## 6. Existing Zod-to-OpenAPI Integration

### Search Results

- **No @asteasolutions/zod-to-openapi found** in dependencies
- **No nestjs-zod found** in dependencies
- **No zod-openapi or similar** in any package.json

### Current State

- API relies on NestJS Swagger reflection of class-validator decorators
- Web uses Zod only for client-side form validation
- **Gap:** No bridge between Zod schemas and OpenAPI generation in API

### Migration Implications

Post-migration, will need to either:

1. Adopt `@asteasolutions/zod-to-openapi` + `nestjs-zod`
2. Manually maintain `@ApiProperty` decorators alongside Zod schemas
3. Use custom NestJS interceptor to generate Swagger from Zod schemas

---

## 7. Dependencies

### Class-Validator & Class-Transformer Versions

**File:** `/apps/api/package.json` (lines 35–36)

```json
"class-transformer": "^0.5.1",
"class-validator": "^0.15.1",
```

### Zod Presence

- **@glossops/shared:** `"zod": "^3.24.2"`
- **apps/api:** `"zod": "^3.24.2"`
- **Consistent versions across monorepo**

### Other Relevant Dependencies (API)

- `@nestjs/swagger`: v11.4.2
- `@nestjs/common`: v11.0.1
- `@prisma/client`: v7.7.0
- `reflect-metadata`: v0.2.2

---

## 8. Test Coverage

### Unit Tests

**Location:** `/apps/api/src/**/[feature].spec.ts`
**Count:** 54 spec files

### E2E Tests

**Location:** `/apps/api/test/` (not in src)
**Count:** 17 `.e2e-spec.ts` files

**Example test structure:**
**File:** `/apps/api/test/suppliers.e2e-spec.ts` (lines 1–50)

```typescript
import { z } from 'zod'
import { SupplierSchema } from '@glossops/shared'

const SupplierPageSchema = z.object({
  data: z.array(SupplierSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

describe('Suppliers (e2e)', () => {
  // Tests validate response shapes using Zod schemas
  it('POST /suppliers — creates supplier', async () => {
    const res = await http.post('/suppliers').set(tenant.authHeaders).send(...)
    const supplier = parseWith(SupplierSchema)(res)  // Validation
  })
})
```

### Test Patterns

- **Unit tests:** Focus on service logic, less on DTO validation
- **E2E tests:** Validate request/response round-trips using Zod schemas from shared
- **Response validation:** Already using `parseWith(ZodSchema)` pattern
- **Request validation:** Currently implicit (happens via ValidationPipe + DTOs)

### Gap: Request DTO Testing

DTOs are validated implicitly by NestJS; tests don't explicitly exercise DTO validation logic. Post-migration, can add explicit request schema validation tests.

---

## 9. Controller Integration Points

**Typical controller method signature:**
**File:** `/apps/api/src/customers/customers.controller.ts` (lines 30–38)

```typescript
@Post()
@Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
@ApiOperation({ summary: 'Create a new customer' })
create(
  @CurrentAccount() account: AuthContext,
  @Body() dto: CreateCustomerDto  // <-- DTO type + validation
): Promise<Prisma.CustomerModel> {
  return this.customersService.create(account.organizationId!, dto)
}
```

### Migration Points

- Replace `CreateCustomerDto` type reference with inferred Zod type
- Keep `@Body()` decorator (NestJS requires validator)
- Update ValidationPipe to support Zod (or use nestjs-zod)
- Update Swagger annotations or adopt zod-to-openapi

---

## 10. Summary Table

| Aspect               | Current State        | File Paths                     | Notes                                    |
| -------------------- | -------------------- | ------------------------------ | ---------------------------------------- |
| **DTO Location**     | 16 feature modules   | `apps/api/src/*/dto/`          | 49 `.dto.ts` files total                 |
| **DTO Validators**   | class-validator      | All DTOs                       | @IsString, @MaxLength, @IsEmail, etc.    |
| **Transformer**      | class-transformer    | 19 DTOs                        | @Type(() => Number), @Transform          |
| **Swagger Metadata** | @nestjs/swagger      | All DTOs                       | @ApiProperty, @ApiPropertyOptional       |
| **ValidationPipe**   | NestJS built-in      | `main.ts` line 98              | Config: `{ whitelist: true }`            |
| **Swagger Setup**    | NestJS SwaggerModule | `main.ts` lines 100–111        | URL: `/api-docs`                         |
| **Shared Package**   | `@glossops/shared`   | `packages/shared/src/`         | Name: @glossops/shared v0.0.1            |
| **Response Schemas** | Zod (feat 33)        | `packages/shared/src/schemas/` | 17+ schemas, all z.object patterns       |
| **Request Schemas**  | None (planned)       | N/A                            | To be created in `request-schemas/`      |
| **Web Schemas**      | Zod                  | `apps/web/src/lib/schemas/`    | 7 domain schemas + tests                 |
| **Zod Version**      | ^3.24.2              | All packages                   | Consistent across monorepo               |
| **Zod-to-OpenAPI**   | Not integrated       | N/A                            | No asteasolutions, nestjs-zod deps       |
| **Unit Tests**       | Jest                 | `apps/api/src/**/*.spec.ts`    | 54 files                                 |
| **E2E Tests**        | Jest + Supertest     | `apps/api/test/*.e2e-spec.ts`  | 17 files, use Zod schemas for validation |
