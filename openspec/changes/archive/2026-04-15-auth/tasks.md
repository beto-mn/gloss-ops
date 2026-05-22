# Tasks: Auth Module

## 1. Install dependencies and setup database package

- [ ] 1.1 Install auth dependencies in the API
- [ ] 1.2 Add @glossops/database as workspace dependency
- [ ] 1.3 Create database package index
- [ ] 1.4 Install workspace dependencies

## 2. Environment config and PrismaService

- [ ] 2.1 Write envs.ts with typed environment variables
- [ ] 2.2 Create PrismaService
- [ ] 2.3 Create PrismaModule
- [ ] 2.4 Verify TypeScript compiles

## 3. RedisTokenStore (TDD)

- [ ] 3.1 Write failing tests for RedisTokenStore
- [ ] 3.2 Run tests and confirm failure
- [ ] 3.3 Implement RedisTokenStore
- [ ] 3.4 Run tests and confirm all pass

## 4. TokenService (TDD)

- [ ] 4.1 Write failing tests for TokenService
- [ ] 4.2 Run tests and confirm failure
- [ ] 4.3 Implement TokenService with issueTokens, rotateTokens, verifyAccessToken, parseRefreshToken
- [ ] 4.4 Run tests and confirm all pass

## 5. Decorators

- [ ] 5.1 Create @Public decorator
- [ ] 5.2 Create @Roles decorator
- [ ] 5.3 Create @CurrentAccount decorator

## 6. AuthGuard (TDD)

- [ ] 6.1 Write failing tests for AuthGuard
- [ ] 6.2 Run tests and confirm failure
- [ ] 6.3 Implement AuthGuard with token extraction, verification, and membership loading
- [ ] 6.4 Run tests and confirm all pass

## 7. RolesGuard (TDD)

- [ ] 7.1 Write failing tests for RolesGuard
- [ ] 7.2 Run tests and confirm failure
- [ ] 7.3 Implement RolesGuard with no_membership and insufficient_role errors
- [ ] 7.4 Run tests and confirm all pass

## 8. DTOs

- [ ] 8.1 Create RegisterDto with email, password, firstName, lastName
- [ ] 8.2 Create LoginDto
- [ ] 8.3 Create TokenResponseDto

## 9. AuthService (TDD)

- [ ] 9.1 Write failing tests for AuthService
- [ ] 9.2 Run tests and confirm failure
- [ ] 9.3 Implement AuthService with register, login, refresh, logout
- [ ] 9.4 Run tests and confirm all pass

## 10. AuthController and AuthModule

- [ ] 10.1 Create AuthController with register, login, refresh, logout endpoints
- [ ] 10.2 Create AuthModule wiring JwtModule, guards, services, and stores

## 11. Wire into AppModule and main.ts

- [ ] 11.1 Update AppModule to import AuthModule, PrismaModule, and register APP_GUARD
- [ ] 11.2 Update main.ts to add ValidationPipe
- [ ] 11.3 Add @Public() to AppController root route
- [ ] 11.4 Verify TypeScript compiles

## 12. E2E Tests

- [ ] 12.1 Update jest-e2e.json to load env vars
- [ ] 12.2 Create e2e setup file
- [ ] 12.3 Write e2e tests for all auth endpoints
- [ ] 12.4 Start Docker services
- [ ] 12.5 Run e2e tests and confirm all pass
