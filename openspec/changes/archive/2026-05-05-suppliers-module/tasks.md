# Tasks: Suppliers Module

## 1. Schema and Migration

- [x] 1.1 Add `@@unique([organizationId, name])` to `Supplier` model in `schema.prisma`
- [x] 1.2 Create migration `add_supplier_unique_name` with the unique index SQL
- [x] 1.3 Run `prisma migrate deploy` and regenerate Prisma client

## 2. Path Aliases and Configuration

- [x] 2.1 Add `@suppliers`, `@suppliers/dto`, `@suppliers/interfaces` entries to `tsconfig.paths.json`
- [x] 2.2 Mirror the same three aliases in `jest.moduleNameMapper` in `apps/api/package.json`

## 3. Interfaces, DTOs, and Tokens

- [x] 3.1 Create `suppliers.tokens.ts` with `SUPPLIER_REPOSITORY` symbol
- [x] 3.2 Create `interfaces/supplier.repository.interface.ts` with all supporting types and interface
- [x] 3.3 Create `interfaces/index.ts` barrel
- [x] 3.4 Create `dto/create-supplier.dto.ts`
- [x] 3.5 Create `dto/update-supplier.dto.ts` with all fields optional and nullable
- [x] 3.6 Create `dto/list-suppliers.dto.ts`
- [x] 3.7 Create `dto/index.ts` barrel

## 4. In-Memory Repository

- [x] 4.1 Create `infrastructure/in-memory-supplier.repository.ts` with name collision detection and FK reference seeding for Inventory and PurchaseOrder
- [x] 4.2 Create `infrastructure/in-memory-supplier.repository.spec.ts` covering all method behaviors

## 5. Prisma Repository

- [x] 5.1 Create `infrastructure/prisma-supplier.repository.ts` with P2002 and P2003 error handling
- [x] 5.2 Create `infrastructure/index.ts` barrel

## 6. Service

- [x] 6.1 Create `suppliers.service.ts` with `findOne` gating for all mutating methods
- [x] 6.2 Create `suppliers.service.spec.ts` covering all service behaviors

## 7. Controller

- [x] 7.1 Create `suppliers.controller.ts` with 5 handlers and full RBAC decorators
- [x] 7.2 Create `suppliers.controller.spec.ts` covering RBAC and DTO validation

## 8. Module Wiring

- [x] 8.1 Create `suppliers.module.ts` binding token to Prisma implementation and exporting `SuppliersService`
- [x] 8.2 Create `index.ts` barrel
- [x] 8.3 Register `SuppliersModule` in `apps/api/src/app.module.ts`

## 9. Verification

- [x] 9.1 Run `pnpm prisma migrate deploy` and confirm migration applied
- [x] 9.2 Run `pnpm lint` with no errors
- [x] 9.3 Run `pnpm test` and confirm all supplier specs pass without breaking existing specs
