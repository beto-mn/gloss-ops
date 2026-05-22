# Tasks: Services Module

## 1. Schema and Migration

- [x] 1.1 Add `@@unique([organizationId, name])` to `Service` model in `schema.prisma`
- [x] 1.2 Create migration `add_service_unique_name` with the unique index SQL
- [x] 1.3 Run migration and regenerate Prisma client

## 2. Path Aliases and Configuration

- [x] 2.1 Add `@services`, `@services/dto`, `@services/interfaces` entries to `tsconfig.paths.json`
- [x] 2.2 Mirror the same three aliases in `jest.moduleNameMapper` in `apps/api/package.json`

## 3. Interfaces, DTOs, and Tokens

- [x] 3.1 Create `services.tokens.ts` with `SERVICE_REPOSITORY` symbol
- [x] 3.2 Create `interfaces/service.repository.interface.ts` with all supporting types and interface including `activate` and `deactivate` methods
- [x] 3.3 Create `interfaces/index.ts` barrel
- [x] 3.4 Create `dto/create-service.dto.ts` with all fields including CFDI and warranty fields
- [x] 3.5 Create `dto/update-service.dto.ts` with all fields optional and nullable, excluding `isActive`
- [x] 3.6 Create `dto/list-services.dto.ts` with `includeInactive` boolean transform
- [x] 3.7 Create `dto/index.ts` barrel

## 4. In-Memory Repository

- [x] 4.1 Create `infrastructure/in-memory-service.repository.ts` with name collision detection and FK reference seeding
- [x] 4.2 Create `infrastructure/in-memory-service.repository.spec.ts` covering all method behaviors

## 5. Prisma Repository

- [x] 5.1 Create `infrastructure/prisma-service.repository.ts` with P2002 and P2003 error handling
- [x] 5.2 Create `infrastructure/index.ts` barrel

## 6. Service

- [x] 6.1 Create `services.service.ts` with `findOne` gating, `isActive` toggle guards, and `findAll` defaults
- [x] 6.2 Create `services.service.spec.ts` covering all service behaviors including activate/deactivate idempotency

## 7. Controller

- [x] 7.1 Create `services.controller.ts` with 7 handlers and full RBAC decorators
- [x] 7.2 Create `services.controller.spec.ts` covering RBAC and DTO validation including `includeInactive` coercion

## 8. Module Wiring

- [x] 8.1 Create `services.module.ts` binding token to Prisma implementation and exporting `ServicesService`
- [x] 8.2 Create `index.ts` barrel
- [x] 8.3 Register `ServicesModule` in `apps/api/src/app.module.ts`

## 9. Verification

- [x] 9.1 Run `pnpm prisma migrate dev` and confirm migration applied
- [x] 9.2 Run `pnpm lint` with no errors
- [x] 9.3 Run `pnpm test` and confirm all service specs pass without breaking existing specs
