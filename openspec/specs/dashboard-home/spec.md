# Spec: Dashboard Home

## Purpose

Defines the dashboard home page (`/`) — the first screen authenticated users land on. The page surfaces key operational metrics via stat cards, provides a recent activity placeholder section, and follows the Gulf Racing design system using shadcn/ui primitives throughout.

---

### Requirement: Dashboard stat cards

The dashboard home page (`/`) SHALL display 6 stat cards in a responsive grid (1 col mobile → 2 col tablet → 3 col desktop). Each card SHALL show a title, a Lucide icon, and a numeric value area. When no real data is available the value area SHALL render a `Skeleton` placeholder.

Cards:

1. Work Orders Today — icon: `ClipboardList`
2. Active Work Orders — icon: `Wrench`
3. Customers — icon: `Users`
4. Vehicles — icon: `Car`
5. Revenue This Month — icon: `TrendingUp`
6. Pending Invoices — icon: `FileText`

#### Scenario: Cards render in skeleton state

- **WHEN** the dashboard page loads and no data is fetched
- **THEN** each stat card shows a `Skeleton` block in place of the numeric value

#### Scenario: Grid is responsive

- **WHEN** the viewport changes from mobile to desktop
- **THEN** the grid reflows from 1 column to 2 to 3 columns at the `sm` and `lg` breakpoints

---

### Requirement: Recent activity placeholder

Below the stat cards, the dashboard SHALL display a "Recent Activity" section with a card containing a placeholder empty state (icon + text: "No recent activity") for now.

#### Scenario: Empty state is displayed

- **WHEN** the recent activity section renders with no data
- **THEN** a centered empty state with an icon and descriptive text is shown

---

### Requirement: Page heading

The dashboard home page SHALL have a visible heading ("Dashboard") and a short subtitle ("Overview of your shop's activity").

#### Scenario: Heading is rendered

- **WHEN** the dashboard page is loaded
- **THEN** the heading and subtitle are visible above the stat cards

---

### Requirement: Responsive dashboard layout

The dashboard page SHALL be fully usable at all breakpoints (375px → 1440px) with no horizontal scroll. All spacing and sizing SHALL use Tailwind responsive utilities — no fixed pixel widths on containers.

#### Scenario: Full width on mobile

- **WHEN** the dashboard renders on a 375px viewport
- **THEN** stat cards stack in a single column and the page has no horizontal overflow

---

### Requirement: Design system compliance

The dashboard page SHALL use shadcn/ui `Card` for stat cards and the "Recent Activity" section — no custom card markup. Gulf Racing design tokens SHALL be applied via CSS variables on top of shadcn defaults. Icons SHALL be Lucide React with `strokeWidth={1.5}`. Skeleton placeholders SHALL use shadcn `Skeleton` component. No hardcoded hex values in any component file.

#### Scenario: Cards match design tokens

- **WHEN** rendered in light mode
- **THEN** card background is `--card` (`#FFFFFF`), card title text uses `--muted-foreground`

#### Scenario: Cards match design tokens in dark

- **WHEN** rendered in dark mode
- **THEN** card background is `--card` (`#1A2730`), card title text uses `--muted-foreground` (`#6FA8C8`)
