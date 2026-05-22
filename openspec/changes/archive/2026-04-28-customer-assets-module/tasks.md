# Tasks: Customer Assets Module

## 1. Schema and migration

- [x] 1.1 Add `AssetType` enum to `schema.prisma`
- [x] 1.2 Migrate `customer_asset.asset_type` from `String` to `AssetType` enum
- [x] 1.3 Add `customAssetType`, `country`, `status`, and `deletedAt` columns to `CustomerAsset`
- [x] 1.4 Run migration `add_customer_asset_soft_delete_enum`
- [x] 1.5 Rebuild the database package to update generated types

## 2. TypeScript path aliases

- [x] 2.1 Add `@customer-assets`, `@customer-assets/dto`, `@customer-assets/interfaces` to `tsconfig.paths.json`
- [x] 2.2 Mirror the three aliases in the Jest `moduleNameMapper`

## 3. Interfaces, DTOs, and tokens

- [x] 3.1 Create `interfaces/customer-asset.repository.interface.ts` with all types and interface
- [x] 3.2 Create `interfaces/index.ts` barrel
- [x] 3.3 Create `dto/create-customer-asset.dto.ts`
- [x] 3.4 Create `dto/update-customer-asset.dto.ts`
- [x] 3.5 Create `dto/list-customer-assets.dto.ts`
- [x] 3.6 Create `dto/index.ts` barrel
- [x] 3.7 Create `customer-assets.tokens.ts`

## 4. In-memory repository and spec

- [x] 4.1 Create `infrastructure/in-memory-customer-asset.repository.ts` with `seedCustomers` and `seedBrands` helpers
- [x] 4.2 Create `infrastructure/in-memory-customer-asset.repository.spec.ts` covering all methods
- [x] 4.3 Run in-memory repo tests to verify they pass

## 5. Prisma repository

- [x] 5.1 Create `infrastructure/prisma-customer-asset.repository.ts` with relation-filter tenant scoping
- [x] 5.2 Create `infrastructure/index.ts` barrel

## 6. Service and spec

- [x] 6.1 Create `customer-assets.service.ts` with all five methods and cross-cutting validations
- [x] 6.2 Create `customer-assets.service.spec.ts` covering all validation paths and delete behaviors
- [x] 6.3 Run service tests to verify they pass

## 7. Controllers and specs

- [x] 7.1 Create `customer-assets-nested.controller.ts` for `/customers/:customerId/assets`
- [x] 7.2 Create `customer-assets-nested.controller.spec.ts` with RBAC checks
- [x] 7.3 Create `customer-assets.controller.ts` for `/customer-assets/:id`
- [x] 7.4 Create `customer-assets.controller.spec.ts` with RBAC and permanent-delete Owner-only checks
- [x] 7.5 Run controller tests to verify they pass

## 8. Module wiring

- [x] 8.1 Create `customer-assets.module.ts` registering both controllers, service, and repo token
- [x] 8.2 Create `index.ts` barrel
- [x] 8.3 Add `CustomerAssetsModule` to `AppModule` imports
- [x] 8.4 Run full test suite to verify all suites pass
