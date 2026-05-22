## 1. Dependencias

- [x] 1.1 Inicializar shadcn/ui con `pnpm dlx shadcn@latest init` en `apps/web` (seleccionar: TypeScript, Tailwind CSS, `src/` directory, App Router, path alias `@/*`)
- [x] 1.2 Instalar TanStack Query: `pnpm add @tanstack/react-query` en `apps/web`
- [x] 1.3 Instalar React Hook Form + Zod + resolver: `pnpm add react-hook-form zod @hookform/resolvers`
- [x] 1.4 Instalar Lucide React: `pnpm add lucide-react`
- [x] 1.5 Instalar next-themes: `pnpm add next-themes`
- [x] 1.6 Instalar Storybook 10: `pnpm dlx storybook@latest init` en `apps/web` (seleccionar framework: `@storybook/nextjs-vite` — Vite, más rápido)

## 2. Design System — CSS Tokens

- [x] 2.1 Reemplazar los colores generados por shadcn en `globals.css` con los tokens Gulf Racing del `design-system/glossops/MASTER.md` (bloque `:root` — light mode)
- [x] 2.2 Agregar el bloque `.dark { }` con los tokens dark mode de la paleta Gulf Racing en `globals.css`
- [x] 2.3 Agregar import de Plus Jakarta Sans en `globals.css`: `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap')`
- [x] 2.4 Aplicar `font-family: 'Plus Jakarta Sans', sans-serif` al body en `globals.css`

## 3. Configuración TypeScript y Next.js

- [x] 3.1 Verificar que el path alias `@/*` → `./src/*` esté en `tsconfig.json` (shadcn lo agrega automáticamente — confirmar)
- [x] 3.2 Verificar `next.config.ts` — no requiere cambios salvo que shadcn los haya introducido

## 4. Estructura de carpetas

- [x] 4.1 Crear `src/components/ui/` (shadcn deposita aquí los componentes generados)
- [x] 4.2 Crear `src/hooks/` con `.gitkeep`
- [x] 4.3 Crear `src/schemas/` con `.gitkeep`
- [x] 4.4 Verificar que `src/lib/utils.ts` exista con la función `cn()` (shadcn la genera automáticamente)

## 5. Providers globales

- [x] 5.1 Crear `src/components/providers.tsx` — Client Component con `QueryClientProvider` (staleTime: 60000, retry: 1) y `ThemeProvider` de next-themes (attribute="class", defaultTheme="system", enableSystem)
- [x] 5.2 Actualizar `src/app/layout.tsx`: importar `Providers`, envolver `{children}`, agregar `suppressHydrationWarning` en el tag `<html>`, agregar clase de fuente al `<body>`

## 6. Storybook

- [x] 6.1 Verificar que `.storybook/main.ts` use `framework: '@storybook/nextjs-vite'`
- [x] 6.2 Agregar import de `../src/app/globals.css` en `.storybook/preview.ts` para que los tokens CSS y Tailwind estén disponibles en stories
- [x] 6.3 Activar App Router en `.storybook/preview.ts`: `parameters: { nextjs: { appDirectory: true } }`
- [x] 6.4 Verificar scripts `"storybook": "storybook dev -p 6006"` y `"build-storybook": "storybook build"` en `package.json` (Storybook los agrega automáticamente)
- [x] 6.5 Eliminar las stories de ejemplo generadas por Storybook (`src/stories/`) — no son necesarias

## 7. Verificación

- [x] 7.1 Ejecutar `pnpm dev` en `apps/web` — confirmar que levanta en puerto 3001 sin errores
- [x] 7.2 Ejecutar `pnpm build` en `apps/web` — confirmar que el build TypeScript pasa limpio
- [x] 7.3 Ejecutar `pnpm storybook` en `apps/web` — confirmar que Storybook abre sin errores y los estilos Tailwind se aplican
- [x] 7.4 Inspeccionar en el navegador que los tokens CSS Gulf Racing (`--primary`, `--background`, etc.) estén presentes en el `:root` y en `.dark`
- [x] 7.5 Verificar toggle de tema: activar dark mode y confirmar que la paleta dark mode se aplica correctamente
