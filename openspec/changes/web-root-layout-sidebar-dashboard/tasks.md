## 1. Dependencies & shadcn components

- [x] 1.1 Install `next-themes` (`pnpm add next-themes --filter web`)
- [x] 1.2 Add shadcn components: `npx shadcn@latest add sheet tooltip avatar separator skeleton` inside `apps/web`

## 2. Theme provider wiring

- [x] 2.1 Wrap `app/layout.tsx` body with `ThemeProvider` from `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`)
- [x] 2.2 Add `suppressHydrationWarning` to `<html>` element in `app/layout.tsx`

## 3. Route group & layout scaffold

- [x] 3.1 Create `src/app/(dashboard)/` directory
- [x] 3.2 Move `src/app/dashboard/page.tsx` → `src/app/(dashboard)/page.tsx`
- [x] 3.3 Create `src/app/(dashboard)/layout.tsx` that renders `<Sidebar>`, `<Header>`, and `<main>{children}</main>` wrapped in `RequireAuth`

## 4. Nav item component

- [x] 4.1 Create `src/components/layout/nav-item.tsx` — wraps shadcn `Button` (variant `ghost`) as the base; accepts `href`, `icon` (LucideIcon), `label`, `isCollapsed`; uses `usePathname` to detect active state; wraps in shadcn `Tooltip` when collapsed
- [x] 4.2 Active state: add `bg-primary/10 text-primary font-medium` on top of the ghost variant — no new component, just className override

## 5. Sidebar component

- [x] 5.1 Create `src/components/layout/sidebar.tsx` — renders logo/brand, nav items list, shadcn `Separator`, and collapse toggle `Button` at the bottom
- [x] 5.2 Nav items: Dashboard (`/`, `LayoutDashboard`), Customers (`/customers`, `Users`), Work Orders (`/work-orders`, `ClipboardList`), Inventory (`/inventory`, `Package`), Services (`/services`, `Wrench`), Activity Log (`/activity-log`, `Activity`)
- [x] 5.3 Implement collapsed state (`useState<boolean>`) with `w-64` / `w-16` transition via Tailwind `transition-[width] duration-200`
- [x] 5.4 Apply design tokens on shadcn base: `bg-card`, `border-r border-border`, hover uses shadcn ghost hover (`hover:bg-accent`)

## 6. Header component

- [x] 6.1 Create `src/components/layout/header.tsx` — sticky top bar using shadcn `Button` (variant `ghost`, size `icon`) for hamburger trigger, theme toggle, and avatar trigger; shadcn `Avatar` for user initials
- [x] 6.2 Theme toggle: shadcn `Button` variant `ghost` size `icon` wrapping `Sun`/`Moon` Lucide icons; calls `setTheme` from `useTheme`
- [x] 6.3 Apply design tokens on top: `bg-background border-b border-border h-14 px-4`

## 7. Mobile Sheet sidebar

- [x] 7.1 In `header.tsx`, wire shadcn `Sheet` + `SheetContent side="left"` that renders the same `<Sidebar>` (always expanded) without the collapse toggle
- [x] 7.2 Pass `onNavClick` callback from Sheet to Sidebar so tapping a nav item closes the Sheet

## 8. Dashboard home page

- [x] 8.1 Create `src/components/dashboard/stat-card.tsx` — built on shadcn `Card` + `CardHeader` + `CardContent`; accepts `title: string`, `icon: LucideIcon`, `value?: string | number`; renders shadcn `Skeleton` when `value` is undefined
- [x] 8.2 Rewrite `src/app/(dashboard)/page.tsx` — renders page heading, 6 `StatCard`s in `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`, and a "Recent Activity" shadcn `Card` with empty state
- [x] 8.3 Recent activity empty state inside shadcn `Card`: `Activity` icon (Lucide) + "No recent activity" text, centered in `CardContent`

## 9. Design system page override

- [x] 9.1 Create `design-system/glossops/pages/dashboard.md` with any dashboard-specific token overrides (sidebar width tokens, stat card icon color)

## 10. Stories

- [x] 10.1 Create `src/components/layout/nav-item.stories.tsx` — active and inactive states, collapsed state with tooltip
- [x] 10.2 Create `src/components/dashboard/stat-card.stories.tsx` — skeleton state and value state

## 11. Verification

- [x] 11.1 Run `pnpm typecheck --filter web` — zero errors
- [x] 11.2 Run `npx vitest --project storybook run` — stories pass (7 files, 31 tests)
- [ ] 11.3 Start dev server (`pnpm dev --filter web`) and verify at 375px: no horizontal scroll, hamburger visible, Sheet opens, single-column stat cards
- [ ] 11.4 Verify at 768px: stat cards in 2-column grid, Sheet still active
- [ ] 11.5 Verify at 1024px+: persistent sidebar visible, hamburger hidden, 3-column stat cards
- [ ] 11.6 Verify dark mode at each breakpoint: sidebar, header, and cards apply correct tokens
