## Why

El backend de GlossOps está completo (19 módulos, 596 tests). El siguiente paso es construir la web app en `apps/web`, que actualmente es un scaffold vacío de Next.js. Para que el desarrollo del frontend sea consistente, accesible y mantenible desde el primer componente, hay que establecer las herramientas, convenciones y el sistema de diseño antes de implementar cualquier pantalla.

## What Changes

- Instalar y configurar **shadcn/ui** sobre Tailwind CSS v4 como sistema de componentes
- Instalar **TanStack Query** para manejo de server state
- Instalar **React Hook Form** + **Zod** para formularios con validación tipada
- Instalar **Lucide React** como set de íconos (stroke-width 1.5, outline)
- Configurar **Plus Jakarta Sans** desde Google Fonts como tipografía única
- Registrar los **CSS tokens** de la paleta Gulf Racing (light + dark mode) en `globals.css`
- Configurar **path aliases** `@/*` → `src/*` en `tsconfig.json`
- Configurar **Storybook** para documentación de componentes UI
- Establecer la **estructura de carpetas** base: `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`
- Configurar providers globales: `QueryClientProvider`, theme provider (dark/light toggle)

## Capabilities

### New Capabilities

- `frontend-setup`: Configuración base del frontend — dependencias, tokens de diseño, estructura de carpetas, Storybook, providers globales

### Modified Capabilities

_(ninguna — este change no modifica specs existentes del backend)_

## Impact

- **`apps/web/package.json`**: nuevas dependencias (shadcn, TanStack Query, RHF, Zod, Lucide, Storybook)
- **`apps/web/src/app/globals.css`**: CSS variables Gulf Racing (light + dark)
- **`apps/web/tsconfig.json`**: path alias `@/*`
- **`apps/web/next.config.ts`**: ajustes menores si los requiere shadcn/Storybook
- **`apps/web/src/app/layout.tsx`**: providers globales (QueryClient, ThemeProvider)
- **`apps/web/.storybook/`**: configuración inicial de Storybook
- Sin impacto en el backend (`apps/api`) ni en la base de datos
