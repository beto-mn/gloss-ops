## Why

The auth flow is complete but there is no authenticated shell — every protected route currently has no navigation, no sidebar, and no consistent layout. Users who log in land in a blank space with no way to navigate the app. This is the foundational step before any domain page (customers, work orders, inventory) can be built.

## What Changes

- Add a persistent collapsible sidebar with navigation links to all Step 6 routes
- Add a top header bar with page title, user avatar, and dark-mode toggle
- Add a root authenticated layout (`app/(dashboard)/layout.tsx`) that wraps all protected pages in sidebar + header + content area
- Move the existing `app/dashboard/page.tsx` under the new `(dashboard)` route group
- Build a dashboard home page with 6 stat cards (skeleton state) and a placeholder recent activity section
- Install and configure `lucide-react` icons (already in the design system spec) for all sidebar nav items
- **All UI is built on shadcn/ui primitives** (`Card`, `Button`, `Avatar`, `Sheet`, `Tooltip`, `Separator`, `Skeleton`) — no custom component primitives from scratch. The Gulf Racing palette and UX polish are layered on top via CSS variables and Tailwind utilities.
- **All components are fully responsive** — mobile-first, tested at 375px / 768px / 1024px / 1440px. The layout adapts: sidebar becomes a Sheet drawer on mobile, stat card grid reflows from 1 → 2 → 3 columns, and no horizontal scroll is introduced at any breakpoint.

## Capabilities

### New Capabilities

- `app-shell`: Root authenticated layout — sidebar, header, content area, responsive behavior (collapse on mobile)
- `dashboard-home`: Dashboard home page with placeholder stat cards and recent activity section

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **New files**: `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/components/layout/nav-item.tsx`, `src/components/dashboard/stat-card.tsx`
- **Moved**: `src/app/dashboard/page.tsx` → `src/app/(dashboard)/page.tsx`
- **Dependencies**: `lucide-react` (already a peer dep via shadcn/ui — no new install needed), shadcn/ui `Sheet`, `Tooltip`, `Avatar`, `Separator`, `Button` components
- **Routing**: All future Step 6 pages will live under `(dashboard)` and inherit the layout automatically
