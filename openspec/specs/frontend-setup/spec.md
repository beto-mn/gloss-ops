## ADDED Requirements

### Requirement: shadcn/ui instalado y configurado

El sistema SHALL tener shadcn/ui inicializado con Tailwind CSS v4, con los CSS tokens de la paleta Gulf Racing registrados en `globals.css` bajo el bloque `@theme`.

#### Scenario: Tokens de color disponibles en tiempo de build

- **WHEN** se ejecuta `pnpm build` en `apps/web`
- **THEN** el build termina sin errores y los tokens `--primary`, `--background`, `--foreground`, `--card`, `--border`, `--destructive`, `--ring`, `--muted`, `--accent`, `--secondary` están definidos en `globals.css`

#### Scenario: Dark mode activo

- **WHEN** el elemento `<html>` tiene la clase `dark`
- **THEN** los tokens CSS del bloque `.dark { }` en `globals.css` sobreescriben los de `:root`, reflejando la paleta Gulf Racing en dark mode

### Requirement: Fuente Plus Jakarta Sans configurada globalmente

El sistema SHALL cargar Plus Jakarta Sans (pesos 300/400/500/600/700) desde Google Fonts y aplicarla como `font-family` base en toda la aplicación.

#### Scenario: Fuente aplicada en layout

- **WHEN** se renderiza cualquier página de la aplicación
- **THEN** el elemento `<body>` tiene `font-family: 'Plus Jakarta Sans', sans-serif` aplicado

### Requirement: Path alias @/\* configurado

El sistema SHALL resolver el alias `@/*` a `./src/*` en TypeScript y en Next.js, permitiendo imports absolutos desde `src/`.

#### Scenario: Import con alias resuelve correctamente

- **WHEN** un archivo importa `@/components/ui/button`
- **THEN** TypeScript resuelve el módulo sin error y el build de Next.js compila correctamente

### Requirement: TanStack Query disponible globalmente

El sistema SHALL exponer un `QueryClientProvider` en el root layout con `staleTime: 60000` y `retry: 1`, disponible para todos los componentes de la aplicación.

#### Scenario: Hook de TanStack Query accesible en cualquier componente

- **WHEN** un Client Component usa `useQuery` o `useMutation`
- **THEN** el hook funciona sin error de contexto faltante

### Requirement: React Hook Form y Zod disponibles

El sistema SHALL tener instalados `react-hook-form` y `zod`, con `@hookform/resolvers` para integración entre ambos.

#### Scenario: Formulario con validación Zod compila

- **WHEN** un componente usa `useForm` con `zodResolver`
- **THEN** TypeScript no reporta errores de tipos y el formulario valida correctamente

### Requirement: Lucide React disponible como sistema de íconos

El sistema SHALL tener `lucide-react` instalado. Todos los íconos de la UI DEBEN provenir de este paquete con `strokeWidth={1.5}`.

#### Scenario: Ícono renderiza correctamente

- **WHEN** un componente importa y renderiza un ícono de `lucide-react`
- **THEN** el ícono se muestra con stroke-width 1.5 sin errores de importación

### Requirement: Storybook configurado y funcional

El sistema SHALL tener Storybook 8 con framework `@storybook/nextjs` configurado, capaz de renderizar componentes que usen Tailwind CSS y los tokens del design system.

#### Scenario: Storybook levanta sin errores

- **WHEN** se ejecuta `pnpm storybook` en `apps/web`
- **THEN** Storybook abre en el navegador y muestra al menos la story de ejemplo sin errores de consola

#### Scenario: Tokens CSS disponibles en stories

- **WHEN** una story renderiza un componente que usa `bg-primary` o `text-foreground`
- **THEN** los colores correctos de la paleta Gulf Racing se aplican visualmente

### Requirement: Theme toggle dark/light funcional

El sistema SHALL tener `next-themes` configurado, permitiendo al usuario cambiar entre tema claro y oscuro. El tema por defecto es `system` (respeta `prefers-color-scheme`).

#### Scenario: Cambio de tema aplica clase dark

- **WHEN** el usuario activa el modo oscuro (via `useTheme().setTheme('dark')`)
- **THEN** la clase `dark` se agrega al elemento `<html>` y los tokens dark mode se activan

#### Scenario: Tema persiste entre recargas

- **WHEN** el usuario selecciona un tema y recarga la página
- **THEN** el tema seleccionado se mantiene (persistido en localStorage por next-themes)

### Requirement: Estructura de carpetas base creada

El sistema SHALL tener la estructura mínima de carpetas: `src/components/ui/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/schemas/`.

#### Scenario: Carpetas existen en el repositorio

- **WHEN** se revisa `apps/web/src/`
- **THEN** existen las carpetas `app/`, `components/ui/`, `components/`, `hooks/`, `lib/`, `schemas/` con al menos un archivo `.gitkeep` en las carpetas vacías

### Requirement: Dev server levanta correctamente

El sistema SHALL iniciar sin errores tras el setup completo.

#### Scenario: pnpm dev sin errores

- **WHEN** se ejecuta `pnpm dev` en `apps/web`
- **THEN** el servidor inicia en el puerto 3001 y la página principal carga sin errores en consola
