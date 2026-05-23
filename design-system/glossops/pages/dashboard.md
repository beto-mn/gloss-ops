# GlossOps — Dashboard Page Overrides

> Inherits from `design-system/glossops/MASTER.md`. Only deviations are listed here.

---

## Layout Tokens

| Token                     | Value           | Description                |
| ------------------------- | --------------- | -------------------------- |
| Sidebar width (expanded)  | `16rem` (w-64)  | Desktop persistent sidebar |
| Sidebar width (collapsed) | `4rem` (w-16)   | Icon-only collapsed state  |
| Header height             | `3.5rem` (h-14) | Sticky top bar             |
| Content padding           | `1.5rem` (p-6)  | Main content area padding  |

## Stat Card Icons

Stat card icons use `text-muted-foreground` (not `text-primary`) to keep the orange CTA reserved for interactive actions. Icon size: 18px, strokeWidth 1.5.

## Active Nav Item

Active nav item uses `bg-primary/10 text-primary` — a 10% opacity tint of `#F06432` — not the full primary color, to avoid over-emphasis on navigation vs. content.

## Sidebar Brand Mark

The "G" brand mark uses `bg-primary text-primary-foreground` (orange + white). Border radius `rounded-md`.
