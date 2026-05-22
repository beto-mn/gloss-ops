# Design: Brands Module

## Context

The `brand` table already existed in the schema with all required columns and the `@@unique([organizationId, slug])` constraint — no schema migration was needed. `CustomerAssetsModule` already referenced `Brand` via a `brandId` FK, but there were no endpoints to manage brands. This module provides that management surface while also enabling `InventoryModule` to associate stock items with brands.

`organizationId` is nullable on `Brand`: `null` means the brand is a globally seeded system brand shared across all organizations. Both tiers are exposed through the same read endpoints, merged and ordered by name.

## Goals

- Expose 5 CRUD endpoints at `/brands` for org-specific brand management
- Return global seeded brands and org-specific brands merged in all read endpoints
- Protect seeded brands from mutation (403 `brand_is_seeded`)
- Enforce `(organizationId, slug)` uniqueness via DB constraint; catch P2002 → 409
- Block deletion of brands referenced by CustomerAsset or Inventory via P2003 → 409
- Export `BrandsService` for use by `InventoryModule`

## Non-Goals

- Brand logo upload — `logoUrl` is a plain URL string, no file upload endpoint
- Brand categories management — `category` is a free-form string
- Branch-level brand restrictions
- Seeding global brands — handled separately outside this module

## Decisions

**Two-tier catalog via nullable organizationId.** Global brands (isSeeded=true, organizationId=null) live in the same table as org-specific brands. The repository's `findById` and `findAll` include brands where `organizationId === caller's org OR isSeeded === true`. This avoids a separate table and keeps queries simple.

**No activate/deactivate.** The schema has no `isActive` field. Hard delete only, with FK protection. Brands are either used or cleaned up.

**Slug uniqueness at DB level.** `@@unique([organizationId, slug])` already existed; the repository catches P2002 on `brand_organization_id_slug_key` and rethrows as `ConflictException`. No extra round-trip `findBySlug` before writes.

**Global brands are in a separate slug namespace.** Slug collision detection only scans brands with the same `organizationId` — a global seeded brand's slug does not conflict with an org-specific brand's slug.

## Risks / Trade-offs

- Seeded brands are visible to all organizations — their IDs are not secret. This is acceptable as brand names are not sensitive data.
- FK protection depends on Prisma catching P2003. If a FK relationship is added in the future without updating the repository's error handling, deletes could fail with an unhandled 500.
