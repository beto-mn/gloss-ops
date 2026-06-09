# Local Setup

## Prerequisites

| Tool       | Version    | Install                |
| ---------- | ---------- | ---------------------- |
| Node.js    | >= 18      | https://nodejs.org     |
| pnpm       | >= 10      | `npm install -g pnpm`  |
| Docker     | >= 24      | https://www.docker.com |
| PostgreSQL | via Docker | see below              |
| Redis      | via Docker | see below              |

## 1. Clone and install

```bash
git clone <repo-url>
cd gloss-ops
pnpm install
```

## 2. Environment variables

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, JWT secrets
```

Required variables (see `.env.example` for full list):

| Variable                         | Example                                          |
| -------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                   | `postgresql://user:pass@localhost:5432/glossops` |
| `REDIS_URL`                      | `redis://localhost:6379`                         |
| `JWT_SECRET`                     | any random string (min 32 chars)                 |
| `JWT_ACCESS_EXPIRES_IN_SECONDS`  | `900` (15 min)                                   |
| `JWT_REFRESH_SECRET`             | any random string (min 32 chars)                 |
| `JWT_REFRESH_EXPIRES_IN_SECONDS` | `604800` (7 days)                                |

## 3. Start database and Redis

```bash
docker-compose up -d
```

Services started:

- PostgreSQL on port `5432`
- Redis on port `6379`

## 4. Apply migrations and seed

```bash
pnpm --filter database db:migrate:dev
pnpm --filter database db:seed
```

## 5. Start the API

```bash
pnpm --filter api dev
# API available at http://localhost:3000
# Swagger UI at http://localhost:3000/docs
```

## 6. Run tests

```bash
# All tests
pnpm test

# API tests only (in-memory, no DB required)
pnpm --filter api test

# Watch mode
pnpm --filter api test:watch
```

Expected: **601 tests across 54 suites**, all passing.

## Troubleshooting

| Problem                            | Likely cause                              | Fix                                            |
| ---------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `Error: connect ECONNREFUSED 5432` | PostgreSQL not running                    | `docker-compose up -d`                         |
| `Error: connect ECONNREFUSED 6379` | Redis not running                         | `docker-compose up -d`                         |
| Migration fails on `account` table | `USER` is reserved in PostgreSQL          | Already handled — the table is named `account` |
| JWT errors in tests                | Tests use in-memory stores, no JWT needed | Run `pnpm --filter api test`, not e2e          |
