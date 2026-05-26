# Spec: App Shell

## Purpose

Defines the authenticated application shell that wraps all dashboard routes. The shell provides persistent navigation (sidebar on desktop, drawer on mobile), a sticky header bar with theme toggle and user avatar, and a scrollable content area. It enforces authentication at the layout level and follows the Gulf Racing design system.

---

### Requirement: Authenticated layout shell

All routes under `app/(dashboard)/` SHALL be wrapped in a layout that renders a sidebar, a top header bar, and a scrollable content area. Unauthenticated users SHALL be redirected to `/login` by `RequireAuth`.

#### Scenario: Authenticated user sees layout

- **WHEN** an authenticated user navigates to any `(dashboard)` route
- **THEN** the sidebar, header, and content area are visible

#### Scenario: Unauthenticated user is redirected

- **WHEN** an unauthenticated user navigates to any `(dashboard)` route
- **THEN** they are redirected to `/login`

---

### Requirement: Sidebar navigation

The sidebar SHALL display navigation links for: Dashboard (`/`), Customers (`/customers`), Work Orders (`/work-orders`), Inventory (`/inventory`), Services (`/services`), Activity Log (`/activity-log`). Each link SHALL show a Lucide icon (stroke-width 1.5) and a text label.

#### Scenario: Active route is highlighted

- **WHEN** the current URL matches a nav item's href
- **THEN** that nav item is rendered with the active style (primary color background, full opacity)

#### Scenario: Inactive nav item hover

- **WHEN** the user hovers over an inactive nav item
- **THEN** it transitions to a muted hover state within 150ms

---

### Requirement: Sidebar collapse (desktop)

On viewports ≥ `lg` (1024px), the sidebar SHALL be collapsible. A toggle button at the bottom of the sidebar SHALL toggle between expanded (`w-64`) and collapsed (`w-16`) states. The transition SHALL be 200ms ease-in-out.

#### Scenario: Collapse hides labels

- **WHEN** the sidebar is collapsed
- **THEN** nav labels are hidden and only the icon is shown, centered

#### Scenario: Collapsed icon shows tooltip

- **WHEN** the sidebar is collapsed AND the user hovers over a nav icon
- **THEN** a Tooltip displays the nav item label

#### Scenario: Expand restores labels

- **WHEN** the user clicks the toggle button while collapsed
- **THEN** the sidebar expands and labels reappear

---

### Requirement: Sidebar as mobile drawer

On viewports < `lg`, the sidebar SHALL be hidden and replaced by a Sheet drawer triggered by a hamburger button in the header. The Sheet SHALL open from the left and close when a nav item is tapped.

#### Scenario: Hamburger button visible on mobile

- **WHEN** the viewport is < 1024px
- **THEN** the hamburger button appears in the header and the persistent sidebar is hidden

#### Scenario: Nav tap closes drawer

- **WHEN** the user taps a nav link inside the open Sheet
- **THEN** the Sheet closes and the user is navigated to the selected route

---

### Requirement: Header bar

The header SHALL render: the current page title (derived from the active route), a dark/light mode toggle button, and the user's avatar (initials fallback). The header SHALL be sticky at the top and have a `z-index` above the content area.

#### Scenario: Theme toggle switches mode

- **WHEN** the user clicks the theme toggle
- **THEN** the `.dark` class is added/removed from `<html>` and the UI re-renders in the new theme

#### Scenario: Avatar shows initials

- **WHEN** the user has no profile image
- **THEN** the avatar displays the first two initials of their name or email

---

### Requirement: Responsive layout

All layout components SHALL be built mobile-first. The shell SHALL be fully usable and produce no horizontal scroll at 375px, 768px, 1024px, and 1440px viewports.

#### Scenario: No horizontal scroll on mobile

- **WHEN** the app shell renders on a 375px viewport
- **THEN** no horizontal scrollbar appears and all content fits within the viewport width

#### Scenario: Layout adapts at lg breakpoint

- **WHEN** the viewport crosses 1024px
- **THEN** the persistent sidebar becomes visible and the hamburger button is hidden

---

### Requirement: Design system compliance

All layout components SHALL be built on shadcn/ui primitives — no raw HTML elements where a shadcn component exists. The Gulf Racing palette and UX polish SHALL be applied on top via CSS variable tokens from `design-system/glossops/MASTER.md`. Icons SHALL be from Lucide React with `strokeWidth={1.5}`. No hardcoded hex values in component files.

#### Scenario: Light mode colors

- **WHEN** the theme is light
- **THEN** sidebar background is `--card` (`#FFFFFF`), foreground is `--foreground` (`#1A2730`)

#### Scenario: Dark mode colors

- **WHEN** the theme is dark
- **THEN** sidebar background is `--card` (`#1A2730`), foreground is `--foreground` (`#B0CEE2`)
