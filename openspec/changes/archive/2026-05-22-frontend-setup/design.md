## Context

`apps/web` es un scaffold de Next.js 16 con Tailwind CSS v4 y TypeScript, sin ningún componente ni dependencia adicional instalada. El backend está completo y expone una API REST en `apps/api`. Este change establece toda la infraestructura del frontend antes de implementar cualquier pantalla.

Estado actual de `apps/web/package.json`:

- `next`, `react`, `react-dom` — instalados
- `tailwindcss` v4, `typescript` — instalados
- Sin shadcn, sin TanStack Query, sin React Hook Form, sin Zod, sin Storybook

## Goals / Non-Goals

**Goals:**

- Instalar y configurar shadcn/ui compatible con Tailwind CSS v4
- Registrar los CSS tokens de la paleta Gulf Racing en `globals.css`
- Instalar TanStack Query, React Hook Form, Zod, Lucide React
- Configurar Plus Jakarta Sans como fuente global
- Configurar path alias `@/*` en `tsconfig.json`
- Configurar Storybook 8 con soporte para Next.js y Tailwind
- Crear la estructura de carpetas base y los providers globales
- Asegurar que el dev server (`pnpm dev`) y Storybook (`pnpm storybook`) levanten sin errores

**Non-Goals:**

- Implementar ninguna pantalla o componente de negocio
- Configurar autenticación o rutas protegidas
- Integrar con el API (eso es responsabilidad de cada feature)
- Configurar CI/CD o deployment

## Decisions

### shadcn/ui con Tailwind CSS v4

**Decisión**: Usar `shadcn@latest` con el flag `--css-variables` y el nuevo formato de configuración para Tailwind v4.

Tailwind v4 elimina `tailwind.config.js` — la configuración se hace directamente en CSS usando `@theme`. shadcn con Tailwind v4 usa `tw-animate-css` en lugar de `tailwindcss-animate`. La inicialización es:

```bash
pnpm dlx shadcn@latest init
```

shadcn detecta Tailwind v4 automáticamente y genera el bloque `@theme` en `globals.css`.

**Alternativa descartada**: Downgrade a Tailwind v3 — innecesario, shadcn soporta v4 oficialmente desde 2025.

### CSS tokens: sobreescribir los generados por shadcn

**Decisión**: Después de `shadcn init`, reemplazar los valores de color en el bloque `@theme` con los tokens de la paleta Gulf Racing definidos en `design-system/glossops/MASTER.md`.

shadcn genera variables CSS con nombres semánticos (`--primary`, `--background`, etc.) que mapean exactamente a los tokens del design system. No se crea un sistema paralelo — se usa el de shadcn directamente.

### TanStack Query: cliente global en layout.tsx

**Decisión**: Crear un `QueryClientProvider` en `src/app/layout.tsx` con configuración de staleTime y retry sensatos para una app operacional:

```ts
staleTime: 60 * 1000,  // 1 minuto
retry: 1,
```

El `QueryClient` se instancia en un Client Component separado (`src/components/providers.tsx`) para no contaminar el Server Component root.

### Theme (dark/light): next-themes

**Decisión**: Usar `next-themes` para manejar el toggle dark/light. Aplica la clase `dark` al `<html>` automáticamente respetando `prefers-color-scheme`. El default es `system`.

**Alternativa descartada**: Implementación manual con Context — next-themes resuelve SSR hydration mismatch out of the box.

### Storybook: versión 10 con framework Next.js Vite

**Decisión**: Usar Storybook 10 (v10.x, última estable) con `@storybook/nextjs-vite` como framework. Storybook 10 requiere Next.js ≥14.1 — el proyecto tiene 16.2.3 ✓.

Se elige `@storybook/nextjs-vite` (Vite) sobre `@storybook/nextjs` (Webpack) por arranque más rápido y mejor DX. Ambos soportan App Router via `appDirectory: true` en `preview.ts`.

Configurar Tailwind en Storybook importando `globals.css` en `preview.ts`. Activar App Router explícitamente:

```ts
// .storybook/preview.ts
parameters: {
  nextjs: {
    appDirectory: true
  }
}
```

Stories colocadas junto a los componentes: `src/components/ui/Button/Button.stories.tsx`.

**Alternativa descartada**: `@storybook/nextjs` (Webpack) — más lento en arranque, sin ventajas para este proyecto.

### Path aliases

**Decisión**: Un único alias `@/*` → `./src/*` en `tsconfig.json` y en `next.config.ts` si es necesario. Consistente con la convención del proyecto (Tier 4 de imports).

### Estructura de carpetas base

```
apps/web/src/
  app/
    layout.tsx          ← providers globales
    page.tsx            ← placeholder (se reemplaza en login-page)
    globals.css         ← tokens Gulf Racing + Tailwind base
  components/
    ui/                 ← componentes shadcn generados
    providers.tsx       ← QueryClientProvider + ThemeProvider
  hooks/                ← custom hooks con TanStack Query (vacío por ahora)
  lib/
    utils.ts            ← cn() utility de shadcn
  schemas/              ← Zod schemas compartidos (vacío por ahora)
```

## Risks / Trade-offs

- **shadcn + Tailwind v4 compatibility**: shadcn soporta v4 pero el ecosistema es más reciente. Si hay conflictos, el fallback es usar `tw-animate-css` manualmente. → Mitigación: verificar que `pnpm build` pase sin errores antes de marcar el change como completo.

- **Storybook + Tailwind v4**: `@storybook/nextjs-vite` 10.x soporta Tailwind v4 via PostCSS. → Mitigación: importar `globals.css` en `preview.ts` para que los tokens CSS estén disponibles en stories.

- **next-themes + App Router**: next-themes requiere `suppressHydrationWarning` en el `<html>` tag para evitar mismatch. → Mitigación: documentado en la tarea de layout.

## Open Questions

_(ninguna — todas las decisiones técnicas están resueltas)_
