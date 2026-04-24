# Deferred: Transacciones atómicas en el flujo de registro

**Fecha:** 2026-04-23
**Estado:** Pendiente — implementar cuando la base de clientes crezca

## Contexto

El endpoint `POST /auth/register` crea registros en dos repositorios distintos de forma secuencial:

1. `AccountRepository.create()` — crea el `Account`
2. `OrganizationRepository.createWithBranch()` — crea `Organization` + `Branch` + `OrganizationMember`

Actualmente estas dos operaciones **no están envueltas en una transacción de base de datos**. Si el paso 2 falla después de que el paso 1 tuvo éxito, el `Account` queda huérfano (sin organización).

## Decisión

Se acepta esta limitación para el MVP. El riesgo es bajo: el edge case es recuperable (el usuario puede reintentar el registro) y añadir la infraestructura de transacciones agrega complejidad significativa antes de tener usuarios reales que proteger.

## Solución a implementar

Cuando la base de clientes justifique la inversión, implementar el patrón **`TransactionService`**:

### 1. Interfaz

```ts
// src/shared/transaction.service.interface.ts
export interface TransactionServiceInterface {
  run<T>(fn: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>
}
```

### 2. Implementación en infrastructure

```ts
// src/shared/infrastructure/prisma-transaction.service.ts
@Injectable()
export class PrismaTransactionService implements TransactionServiceInterface {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (tx: PrismaTransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn)
  }
}
```

### 3. Repositorios aceptan `tx` opcional

```ts
// AccountRepositoryInterface
create(data: CreateAccountData, tx?: PrismaTransactionClient): Promise<Account>

// OrganizationRepositoryInterface
createWithBranch(data: CreateOrgData, accountId: string, tx?: PrismaTransactionClient): Promise<{ organization, member }>
```

### 4. AuthService coordina con la transacción

```ts
async register(dto: RegisterDto): Promise<TokenPair> {
  return this.tx.run(async (tx) => {
    const account = await this.accounts.create({ ... }, tx)
    const { member } = await this.organizations.createWithBranch({ ... }, account.id, tx)
    return this.tokenService.issueTokens(account.id, account.email)
  })
}
```

## Trigger para implementar

- Primeros incidentes de accounts huérfanos en producción, o
- Base de clientes activos que justifique tolerancia cero a inconsistencias
