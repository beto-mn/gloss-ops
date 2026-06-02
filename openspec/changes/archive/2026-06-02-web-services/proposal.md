## Why

The services catalog page is a placeholder. OWNER/MANAGER users have no way to create, edit, activate/deactivate, or delete services through the UI — they must go directly to the API. This is the first high-traffic admin screen that shop managers will use daily to maintain their price list.

## What Changes

- Replace placeholder at `/services` with a full paginated list (search, status tabs, row actions)
- Add create/edit drawer with all service fields including CFDI codes
- Add activate/deactivate toggle per row (OWNER/MANAGER)
- Add delete with confirmation dialog (OWNER only, blocked by API if service has references)
- Extend `use-services.ts` with full mutation hooks (create, update, activate, deactivate, delete)
- Extend `service.schema.ts` with Zod schemas for create/update and list params type

## Capabilities

### New Capabilities

- `services-list-page`: Paginated table at `/services` with search, status tabs (Todos/Activos/Inactivos), status badges, and per-row actions scoped by RBAC role
- `services-create-edit`: Drawer form for creating and editing services — name, description, price, warrantyDays, claveProdServ, claveUnidad

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- `apps/web/src/app/(dashboard)/services/page.tsx` — replaced
- `apps/web/src/hooks/use-services.ts` — extended with mutations and parameterized list query
- `apps/web/src/lib/schemas/service.schema.ts` — extended with Zod schemas and list params
- No API changes, no new dependencies
