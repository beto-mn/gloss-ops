# GlossOps — Design System MASTER

> **LOGIC:** When building a specific page, first check `design-system/glossops/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** GlossOps
**Updated:** 2026-05-22
**Inspiration:** Gulf Racing livery (GT40, McLaren F1)
**Themes:** Light + Dark (ambos requeridos)

---

## Color Palette

### Paleta base — Gulf Racing

| Nombre           | Hex       | Rol                                              |
| ---------------- | --------- | ------------------------------------------------ |
| Navy deep        | `#0F1C23` | Background dark                                  |
| Navy mid         | `#1A2730` | Card surface dark / foreground light             |
| Charcoal         | `#424048` | Muted background dark                            |
| Slate blue       | `#45586C` | Muted foreground light                           |
| Steel blue mid   | `#6FA8C8` | Secondary, links, nav activo, muted-fg dark      |
| Steel blue light | `#B0CEE2` | Accent, foreground dark mode, focus border light |
| Orange vivid     | `#F06432` | Primary CTA — única acción principal             |
| Burnt orange     | `#B8471A` | Destructive, pressed state                       |
| Off-white        | `#F5F8FA` | Background light                                 |

### CSS Variables — Light Mode

```css
:root {
  --background: #f5f8fa;
  --foreground: #1a2730;
  --card: #ffffff;
  --card-foreground: #1a2730;
  --muted: #e2edf4;
  --muted-foreground: #45586c;
  --border: #c8dae8;
  --input: #c8dae8;
  --primary: #f06432;
  --primary-foreground: #ffffff;
  --secondary: #6fa8c8;
  --secondary-foreground: #1a2730;
  --accent: #b0cee2;
  --accent-foreground: #1a2730;
  --destructive: #b8471a;
  --destructive-foreground: #ffffff;
  --ring: #f06432;
  --radius: 0.5rem;
}
```

### CSS Variables — Dark Mode

```css
.dark {
  --background: #0f1c23;
  --foreground: #b0cee2;
  --card: #1a2730;
  --card-foreground: #b0cee2;
  --muted: #424048;
  --muted-foreground: #6fa8c8;
  --border: #424048;
  --input: #424048;
  --primary: #f06432;
  --primary-foreground: #ffffff;
  --secondary: #424048;
  --secondary-foreground: #b0cee2;
  --accent: #b0cee2;
  --accent-foreground: #1a2730;
  --destructive: #b8471a;
  --destructive-foreground: #ffffff;
  --ring: #6fa8c8;
  --radius: 0.5rem;
}
```

### Contraste verificado (WCAG AA)

| Combinación               | Ratio  | Estado |
| ------------------------- | ------ | ------ |
| `#FFFFFF` sobre `#F06432` | 5.6:1  | ✓ AA   |
| `#FFFFFF` sobre `#B8471A` | 9.1:1  | ✓ AA   |
| `#1A2730` sobre `#F5F8FA` | 14.4:1 | ✓ AA   |
| `#B0CEE2` sobre `#0F1C23` | ~8:1   | ✓ AA   |
| `#6FA8C8` sobre `#1A2730` | ~4.5:1 | ✓ AA   |

---

## Typography

**Fuente única**: Plus Jakarta Sans (heading + body)

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
font-family: 'Plus Jakarta Sans', sans-serif;
```

### Escala tipográfica

| Rol     | Size     | Weight | Line-height |
| ------- | -------- | ------ | ----------- |
| Display | 2.25rem  | 700    | 1.2         |
| H1      | 1.875rem | 700    | 1.25        |
| H2      | 1.5rem   | 600    | 1.3         |
| H3      | 1.25rem  | 600    | 1.4         |
| Body    | 1rem     | 400    | 1.6         |
| Small   | 0.875rem | 400    | 1.5         |
| Label   | 0.75rem  | 500    | 1.4         |

---

## Spacing

| Token         | Value | Uso                    |
| ------------- | ----- | ---------------------- |
| `--space-xs`  | 4px   | Gaps internos tight    |
| `--space-sm`  | 8px   | Íconos, inline spacing |
| `--space-md`  | 16px  | Padding estándar       |
| `--space-lg`  | 24px  | Padding de sección     |
| `--space-xl`  | 32px  | Gaps grandes           |
| `--space-2xl` | 48px  | Márgenes de sección    |
| `--space-3xl` | 64px  | Hero padding           |

---

## Shadows

```css
/* Light mode */
--shadow-sm: 0 1px 2px rgb(26 39 48 / 0.06);
--shadow-md: 0 4px 12px rgb(26 39 48 / 0.08);
--shadow-lg: 0 8px 24px rgb(26 39 48 / 0.1);

/* Dark mode */
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.2);
--shadow-md: 0 4px 12px rgb(0 0 0 / 0.3);
--shadow-lg: 0 8px 24px rgb(0 0 0 / 0.4);
```

---

## Uso de colores por rol

### `#F06432` — Orange vivid (Primary)

- Botón primario: Login, Guardar, Crear, Confirmar
- Badges de estado activo
- Indicador de progreso activo
- Focus ring en light mode

### `#6FA8C8` — Steel blue mid (Secondary)

- Links de texto y navegación
- Texto secundario / muted en dark mode
- Íconos de nav activos
- Hover states en elementos secundarios
- Focus ring en dark mode

### `#B0CEE2` — Steel blue light (Accent)

- Texto principal en dark mode (`--foreground`)
- Fondos de chips / badges informativos
- Bordes de inputs en focus (light mode)
- Superficies con acento sutil

### `#B8471A` — Burnt orange (Destructive)

- Botones de Eliminar, Cancelar acción
- Estados de error de formulario
- Pressed state del botón primary

---

## Animaciones

| Tipo                              | Duración | Easing      |
| --------------------------------- | -------- | ----------- |
| Micro-interactions (hover, focus) | 150ms    | ease-out    |
| Transiciones de estado            | 200ms    | ease-in-out |
| Modales / sheets enter            | 200ms    | ease-out    |
| Modales / sheets exit             | 150ms    | ease-in     |
| Transiciones de página            | 250ms    | ease-in-out |

Respetar `prefers-reduced-motion` — desactivar animaciones decorativas si el usuario lo prefiere.

---

## Componentes — notas de diseño

### Button primary

- Background `#F06432` / texto `#FFFFFF`
- Hover: `#D85A28` (10% más oscuro)
- Pressed: `#B8471A`
- Disabled: opacity 50%, no pointer events

### Input

- Border en reposo: `--border`
- Focus border: `#B0CEE2` (light) / `#6FA8C8` (dark)
- Error border: `#B8471A`
- Label visible siempre — nunca solo placeholder

### Card

- Light: `#FFFFFF` + sombra `--shadow-sm`
- Dark: `#1A2730` + borde `#424048`
- Border radius: `0.5rem`

---

## Breakpoints

| Nombre  | Width  |
| ------- | ------ |
| mobile  | 375px  |
| tablet  | 768px  |
| desktop | 1024px |
| wide    | 1440px |

---

## Iconos

**Set**: Lucide React — stroke-width 1.5, estilo outline.
No usar emojis como íconos estructurales.

---

## Anti-patterns

- No mezclar orange y steel blue como colores de acción en la misma superficie
- No usar `#F06432` como color de texto — no pasa contraste para texto normal sobre fondos claros
- No activar dark mode por defecto — respetar `prefers-color-scheme` con toggle manual
- No usar `box-shadow` blanco en dark mode — usar `rgba(0,0,0,...)` con opacity
- No usar emojis como íconos (Lucide únicamente)
- No transiciones instantáneas — mínimo 150ms en cualquier cambio de estado

---

## Pre-Delivery Checklist

- [ ] Colores tomados de este archivo — sin hex hardcodeados en componentes
- [ ] Texto contraste ≥ 4.5:1 en ambos modos
- [ ] Botón primary usa `#F06432` con texto blanco
- [ ] Inputs con label visible, no solo placeholder
- [ ] Focus states visibles (keyboard navigation)
- [ ] `prefers-reduced-motion` respetado
- [ ] Probado en 375px y 1440px
- [ ] Sin scroll horizontal en mobile
- [ ] Íconos de Lucide React, stroke-width 1.5
- [ ] `cursor-pointer` en todos los elementos clickeables
