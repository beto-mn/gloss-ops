# Tasks: Soft Delete & Hard Delete

## 1. Add ResourceStatus enum to Prisma schema and migrate

- [x] 1.1 Add `ResourceStatus` enum to `schema.prisma`
- [x] 1.2 Add `status` field to `Customer` model
- [x] 1.3 Add `status` field to `Organization` model
- [x] 1.4 Run migration `add_resource_status`
- [x] 1.5 Rebuild the database package to update generated types

## 2. Customers – Interface + InMemory Repository + Tests

- [x] 2.1 Write failing tests for `softDelete` behavior in in-memory repo spec
- [x] 2.2 Run tests to verify they fail with "softDelete is not a function"
- [x] 2.3 Add `softDelete` to `CustomerRepositoryInterface`
- [x] 2.4 Update `InMemoryCustomerRepository` to implement `softDelete` and status filtering
- [x] 2.5 Run tests to verify they pass

## 3. Customers – Prisma Repository

- [x] 3.1 Update `PrismaCustomerRepository` with status filters and `softDelete` method

## 4. Customers – Service + Controller + Specs

- [x] 4.1 Write failing service tests for new `remove` behaviors
- [x] 4.2 Write failing controller test for permanent-delete RBAC
- [x] 4.3 Run tests to verify they fail
- [x] 4.4 Update `CustomersService.remove` to accept `permanent` flag
- [x] 4.5 Update `CustomersController.remove` with `?permanent` param and Owner-only guard
- [x] 4.6 Run tests to verify they pass

## 5. Organizations – Interface + InMemory Repository + Tests

- [x] 5.1 Write failing tests for `softDelete`, `delete`, and DELETED-record filtering
- [x] 5.2 Run tests to verify they fail
- [x] 5.3 Add `softDelete` and `delete` to `OrganizationRepositoryInterface`
- [x] 5.4 Update `InMemoryOrganizationRepository` with `softDelete`, `delete`, and status filtering
- [x] 5.5 Run tests to verify they pass

## 6. Organizations – Prisma Repository + Service + Controller + Specs

- [x] 6.1 Write failing service tests for `removeOrganization`
- [x] 6.2 Run tests to verify they fail
- [x] 6.3 Update `PrismaOrganizationRepository` with status filters, `softDelete`, and `delete`
- [x] 6.4 Add `removeOrganization` method to `OrganizationsService`
- [x] 6.5 Run service tests to verify they pass
- [x] 6.6 Add `DELETE /organizations/me` endpoint to `OrganizationsController`
- [x] 6.7 Run all tests to verify nothing is broken
