# Tasks: Brands Module

## 1. Path Aliases and Configuration

- [x] 1.1 Add `@brands`, `@brands/dto`, `@brands/interfaces` entries to `tsconfig.paths.json`
- [x] 1.2 Mirror the same three aliases in `jest.moduleNameMapper` in `apps/api/package.json`

## 2. Interfaces, DTOs, and Tokens

- [x] 2.1 Create `brands.tokens.ts` with `BRAND_REPOSITORY` symbol
- [x] 2.2 Create `interfaces/brand.repository.interface.ts` with all supporting types and interface
- [x] 2.3 Create `interfaces/index.ts` barrel
- [x] 2.4 Create `dto/create-brand.dto.ts`
- [x] 2.5 Create `dto/update-brand.dto.ts` with all fields optional and nullable
- [x] 2.6 Create `dto/list-brands.dto.ts`
- [x] 2.7 Create `dto/index.ts` barrel

## 3. In-Memory Repository

- [x] 3.1 Create `infrastructure/in-memory-brand.repository.ts` backed by Map with global brand seeding and FK reference seeding
- [x] 3.2 Create `infrastructure/in-memory-brand.repository.spec.ts` covering all method behaviors

## 4. Prisma Repository

- [x] 4.1 Create `infrastructure/prisma-brand.repository.ts` with P2002 and P2003 error handling
- [x] 4.2 Create `infrastructure/index.ts` barrel

## 5. Service

- [x] 5.1 Create `brands.service.ts` with `findOne` gating and `isSeeded` guard for mutations
- [x] 5.2 Create `brands.service.spec.ts` covering all service behaviors

## 6. Controller

- [x] 6.1 Create `brands.controller.ts` with 5 handlers and full RBAC decorators
- [x] 6.2 Create `brands.controller.spec.ts` covering RBAC and DTO validation

## 7. Module Wiring

- [x] 7.1 Create `brands.module.ts` binding token to Prisma implementation and exporting `BrandsService`
- [x] 7.2 Create `index.ts` barrel
- [x] 7.3 Register `BrandsModule` in `apps/api/src/app.module.ts`

## 8. Verification

- [x] 8.1 Run `npx jest "brand"` and confirm all brand specs pass
- [x] 8.2 Run `pnpm lint` with no errors
- [x] 8.3 Run `pnpm build` with no TypeScript errors
