# Auth Pages — Design Override

> Covers `/login` and `/register`. Extends `MASTER.md` tokens.

## Layout

Full-screen split layout on desktop, stacked on mobile:

```
┌────────────────────────────────────────────────────────────┐
│  Brand Panel (left, 40%)     │  Form Panel (right, 60%)    │
│                              │                             │
│  Logo                        │  ┌────────────────────────┐ │
│  GlossOps                    │  │   Card (max-w-md)       │ │
│                              │  │                         │ │
│  "Operaciones de taller      │  │   Title                 │ │
│   en un solo lugar."         │  │   Subtitle / link       │ │
│                              │  │                         │ │
│  Background: --primary       │  │   Form fields           │ │
│  (#F06432)                   │  │   Submit button         │ │
│                              │  │                         │ │
│                              │  │   Footer link           │ │
│                              │  └────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

Mobile (< 768px): brand panel hidden, form centered full-height
```

## Brand Panel

- Background: `--primary` (#F06432)
- Logo: white SVG or text mark, centered
- Tagline: white, `text-lg font-medium`, centered
- Hidden on mobile (`hidden md:flex`)

## Form Panel

- Background: `--background`
- Centered vertically and horizontally (`flex items-center justify-center`)
- Full height: `min-h-dvh`

## Card

- Max width: `max-w-md w-full`
- Background: `--card`
- Border radius: `rounded-xl`
- Padding: `p-8`
- Light: white + `shadow-md` (`0 4px 12px rgb(26 39 48 / 0.08)`)
- Dark: `#1A2730` + border `#424048`

## Typography

- Card title (h1): `text-2xl font-bold text-foreground`
- Card subtitle: `text-sm text-muted-foreground`
- Field labels: `text-sm font-medium text-foreground`
- Error messages: `text-sm text-destructive`
- Footer links: `text-sm text-secondary hover:underline`

## Form Fields

- Input height: `h-10` (meets 44px touch target with padding)
- Border at rest: `--border` (#C8DAE8 light / #424048 dark)
- Focus border: `--ring` (#F06432 light / #6FA8C8 dark)
- Error border: `--destructive` (#B8471A)
- Labels always visible — no placeholder-only fields
- Error messages appear directly below each field

## Submit Button

- Full-width: `w-full`
- Background: `--primary` (#F06432)
- Text: `--primary-foreground` (#FFFFFF)
- Height: `h-10`
- Border radius: `rounded-md`
- Loading state: spinner icon + disabled

## Password Toggle

- Lucide icon: `Eye` / `EyeOff`, `size-4`
- Positioned inside the input on the right
- `stroke-width: 1.5`
- Color: `--muted-foreground`

## Footer Links

- "¿No tienes cuenta? **Regístrate**" → `/register`
- "¿Ya tienes cuenta? **Inicia sesión**" → `/login`
- Centered below the card
- Link text: `--secondary` (#6FA8C8)

## Responsive Behavior

| Breakpoint | Brand Panel | Form                     |
| ---------- | ----------- | ------------------------ |
| < 768px    | Hidden      | Full width, centered     |
| ≥ 768px    | 40% width   | 60% width                |
| ≥ 1024px   | 40% width   | 60% width, card max-w-md |
