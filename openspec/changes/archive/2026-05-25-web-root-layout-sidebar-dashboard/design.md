## Context

`apps/web` has a working auth flow (login + register pages, `use-auth` hook, httpOnly cookie session via route handlers) but no authenticated shell. Protected pages render without any surrounding navigation. The design system (`design-system/glossops/MASTER.md`) defines the Gulf Racing palette, Plus Jakarta Sans font, Lucide icons at stroke-width 1.5, and tokens for both light and dark mode.

## Goals / Non-Goals

**Goals**

- Ship a reusable layout shell that all Step 6 domain pages inherit automatically
- Collapsible sidebar (icon-only on collapse) for comfortable use on laptop screens
- Mobile: sidebar as a Sheet drawer triggered from the header
- Dashboard home with skeleton stat cards — no real data fetching yet
- Light/dark mode toggle in header, persisted via `next-themes`

**Non-Goals**

- Real data on the dashboard (no API calls for stats — skeleton only)
- Notification system, user settings page, search
- Breadcrumbs (routes are only one level deep for now)

## Decisions

### 0. shadcn/ui as the exclusive component foundation

Every visible UI element SHALL be a shadcn/ui primitive or composed from one. No component is built from raw HTML + Tailwind alone when a shadcn equivalent exists. The only customization layer is: (a) Gulf Racing CSS variables applied via the existing token system, and (b) Tailwind utility classes for spacing, sizing, and state polish. This means `Card`, `Button`, `Avatar`, `Sheet`, `Tooltip`, `Separator`, and `Skeleton` come from shadcn/ui; custom layout components (`Sidebar`, `Header`, `NavItem`) compose those primitives rather than reimplementing them.

**Why**: Consistency across the app is enforced at the component level. Future pages in Step 6 follow the same pattern without needing design decisions.

### Responsiveness as a first-class constraint

Every component is built mobile-first. Breakpoints follow the design system: `sm` (768px), `lg` (1024px), `xl` (1440px). Specific rules:

- `< lg`: sidebar hidden, replaced by Sheet drawer; hamburger visible in header
- `≥ lg`: persistent sidebar, hamburger hidden
- Stat card grid: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3`
- No `px` fixed widths on containers — use Tailwind responsive utilities only
- `min-h-dvh` instead of `min-h-screen` to handle mobile browser chrome
- Content area must not produce horizontal scroll at any breakpoint

### 1. Route group `(dashboard)` for the authenticated shell

All protected pages live under `src/app/(dashboard)/`. Next.js route groups allow a shared layout without adding a URL segment. `layout.tsx` in that group renders sidebar + header + `{children}`. The existing `app/dashboard/page.tsx` moves to `app/(dashboard)/page.tsx`.

**Alternative considered**: Single root `layout.tsx` in `src/app/`. Rejected — the auth layout (`(auth)/layout.tsx`) and the shell layout have different structures; a shared root would require conditional rendering per route.

### 2. Sidebar state via React state + CSS transition (no external lib)

Collapsed state (`isCollapsed: boolean`) is local to the sidebar component and toggled by a button. Width transitions from `w-64` (open) to `w-16` (collapsed) via `transition-width duration-200`. Nav item labels are hidden when collapsed and the icon is centered. Tooltip (shadcn `Tooltip`) shows the label on hover when collapsed.

**Alternative considered**: `next-sidebar` or `shadcn/ui sidebar` (new experimental). Rejected — the shadcn sidebar primitive is still experimental and brings significant boilerplate; a hand-rolled implementation keeps the component small and aligned to the existing codebase style.

### 3. Mobile drawer via shadcn `Sheet`

On viewports < `lg` (1024px), the sidebar is hidden and a hamburger button in the header opens it as a `Sheet` from the left. This avoids a persistent sidebar consuming space on small screens.

### 4. Dark mode via `next-themes`

`next-themes` wraps the app in a `ThemeProvider`. The root `layout.tsx` (`app/layout.tsx`) already sets `suppressHydrationWarning`. The header renders a toggle button that calls `setTheme`. Class strategy: `class` (adds `.dark` to `<html>`), which matches the existing Tailwind dark-mode config.

### 5. Stat cards with skeleton — Suspense boundary deferred

Dashboard stat cards render a `StatCard` component that accepts optional `value` and `label` props. When no value is passed it shows a `Skeleton` (shadcn). This keeps the component reusable: Step 6 can pass real data in via TanStack Query without changing the card API.

## Risks / Trade-offs

| Risk                                                 | Mitigation                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar width transition causes layout reflow        | Use `min-w` + `overflow-hidden` to contain the resize; avoid width animation on the main content — instead use `ml-64`/`ml-16` with the same transition |
| `next-themes` flash of unstyled content on page load | Add `attribute="class"` and `defaultTheme="system"` to ThemeProvider; Next.js `suppressHydrationWarning` on `<html>` prevents mismatch errors           |
| Sheet + sidebar showing simultaneously on resize     | Track open state with `useEffect` that closes Sheet on `lg` breakpoint                                                                                  |

## Migration Plan

1. Install `next-themes` (`pnpm add next-themes --filter web`)
2. Move `app/dashboard/page.tsx` → `app/(dashboard)/page.tsx`
3. Add new files under `(dashboard)/` and `components/layout/`
4. Verify existing auth routes (`/login`, `/register`) are unaffected — they remain under `(auth)/`
5. No API changes, no database changes, no breaking changes to existing routes

## Open Questions

_(none — all decisions resolved above)_
