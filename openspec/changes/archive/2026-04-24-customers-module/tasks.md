# Tasks: Customers Module

## 1. Repository Interface, Types, DTOs & Token

- [ ] 1.1 Create customer.repository.interface.ts with CreateCustomerData, UpdateCustomerData, CustomerQuery, CustomerPage, and CustomerRepositoryInterface
- [ ] 1.2 Create interfaces/index.ts barrel
- [ ] 1.3 Create CreateCustomerDto with class-validator decorators
- [ ] 1.4 Create UpdateCustomerDto with all optional nullable fields
- [ ] 1.5 Create ListCustomersDto for search, page, limit query params
- [ ] 1.6 Create dto/index.ts barrel
- [ ] 1.7 Create customers.tokens.ts with CUSTOMER_REPOSITORY symbol
- [ ] 1.8 Add @customers, @customers/dto, @customers/interfaces path aliases to tsconfig.paths.json

## 2. In-Memory Repository + Tests (TDD)

- [ ] 2.1 Write failing tests for InMemoryCustomerRepository
- [ ] 2.2 Run tests and confirm failures
- [ ] 2.3 Implement InMemoryCustomerRepository with create, findById, findAll, findByEmail, findByPhone, update, delete
- [ ] 2.4 Run tests and confirm all pass

## 3. CustomerService + Tests (TDD)

- [ ] 3.1 Write failing tests for CustomersService
- [ ] 3.2 Run tests and confirm failures
- [ ] 3.3 Implement CustomersService with create, findAll, findOne, update, remove and uniqueness checks
- [ ] 3.4 Run tests and confirm all pass

## 4. Prisma Implementation

- [ ] 4.1 Implement PrismaCustomerRepository with all interface methods and organizationId scoping

## 5. Controller, Module, Barrel & App Wiring

- [ ] 5.1 Create CustomersController with POST, GET (list), GET (one), PATCH, DELETE endpoints
- [ ] 5.2 Create CustomersModule binding CUSTOMER_REPOSITORY to PrismaCustomerRepository
- [ ] 5.3 Create customers/index.ts barrel
- [ ] 5.4 Register CustomersModule in AppModule
- [ ] 5.5 Run full test suite and confirm no regressions
