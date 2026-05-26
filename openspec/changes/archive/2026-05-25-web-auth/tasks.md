## 1. Design system override

- [x] 1.1 Crear `design-system/glossops/pages/login.md` con el layout visual de la página (card centrado, panel de marca, responsive)

## 2. Zod schema y tipos

- [x] 2.1 Crear `src/lib/schemas/auth.schema.ts` con el schema Zod `loginSchema` (email válido + password mínimo 8 caracteres)
- [x] 2.2 Exportar el tipo inferido `LoginFormValues` desde el mismo archivo

## 3. API client con interceptor de refresh

- [x] 3.1 Crear `src/lib/api-client.ts` con función `apiFetch` que adjunta `Authorization: Bearer <accessToken>` a cada request
- [x] 3.2 Implementar interceptor de 401: si la respuesta es 401, llamar `POST /auth/refresh` con el refresh token almacenado
- [x] 3.3 Si el refresh es exitoso: guardar el nuevo par de tokens y reintentar el request original una vez
- [x] 3.4 Si el refresh falla (`invalid_refresh_token` o error de red): limpiar ambos tokens de `localStorage` y redirigir a `/login`

## 4. Hook de login

- [x] 4.1 Crear `src/hooks/use-auth.ts` con el hook `useLogin` usando `useMutation` de TanStack Query
- [x] 4.2 El hook llama a `POST /auth/login` con `{ email, password }` via `apiFetch`
- [x] 4.3 En `onSuccess`: guardar `accessToken` en `localStorage` bajo `gloss_access_token` y `refreshToken` bajo `gloss_refresh_token`
- [x] 4.4 Manejar errores del hook y exponerlos para que el form los muestre

## 5. Zod schema para register

- [x] 5.1 Agregar `registerSchema` en `src/lib/schemas/auth.schema.ts`: name (min 2 chars) + email + orgName (min 2 chars) + password (min 8 chars) + confirmPassword (must match password via `.refine`)
- [x] 5.2 Exportar el tipo inferido `RegisterFormValues` desde el mismo archivo

## 6. Hook de register y logout

- [x] 6.1 Agregar hook `useRegister` en `src/hooks/use-auth.ts` usando `useMutation` de TanStack Query
- [x] 6.2 El hook llama a `POST /auth/register` con `{ name, email, orgName, password }` via `apiFetch`
- [x] 6.3 En `onSuccess`: guardar ambos tokens en `localStorage` igual que `useLogin`
- [x] 6.4 Agregar hook `useLogout` en `src/hooks/use-auth.ts`
- [x] 6.5 `useLogout` llama a `POST /auth/logout` con el refresh token, luego limpia ambos tokens de `localStorage` y redirige a `/login` — incluso si la llamada falla (optimistic sign out)

## 7. Componente LoginForm

- [x] 7.1 Crear `src/components/auth/login-form.tsx` como Client Component
- [x] 7.2 Usar `useForm` de React Hook Form con `zodResolver` y `loginSchema`
- [x] 7.3 Renderizar campo email con label visible y mensaje de error inline
- [x] 7.4 Renderizar campo password con label visible, toggle show/hide (ícono Lucide), y mensaje de error inline
- [x] 7.5 Renderizar botón de submit que muestre spinner y se deshabilite durante el loading
- [x] 7.6 Mostrar mensaje de error de API debajo del form cuando el login falle
- [x] 7.7 Limpiar el campo password y enfocar el email field cuando la API retorne error
- [x] 7.8 Aplicar tokens Gulf Racing: card blanco/`#1A2730`, botón `--primary`, inputs con borde `--border`

## 8. Componente RegisterForm

- [x] 8.1 Crear `src/components/auth/register-form.tsx` como Client Component
- [x] 8.2 Usar `useForm` con `zodResolver` y `registerSchema`
- [x] 8.3 Renderizar campos: name, email, orgName, password (con toggle), confirmPassword (con toggle)
- [x] 8.4 Renderizar botón de submit con spinner y deshabilitado durante loading
- [x] 8.5 Mostrar mensaje de error de API debajo del form cuando el register falle
- [x] 8.6 Limpiar los campos password y confirmPassword cuando la API retorne error
- [x] 8.7 Aplicar los mismos tokens Gulf Racing que `LoginForm`

## 9. Páginas de login, register y layout

- [x] 9.1 Crear `src/app/(auth)/layout.tsx` con layout full-screen centrado (sin navbar)
- [x] 9.2 Crear `src/app/(auth)/login/page.tsx` que renderiza `LoginForm`
- [x] 9.3 La página llama a `router.push('/dashboard')` tras login exitoso (pasado como `onSuccess` prop al form)
- [x] 9.4 Agregar enlace "¿No tienes cuenta? Regístrate" en la página de login apuntando a `/register`
- [x] 9.5 Crear `src/app/(auth)/register/page.tsx` que renderiza `RegisterForm`
- [x] 9.6 La página llama a `router.push('/dashboard')` tras register exitoso
- [x] 9.7 Agregar enlace "¿Ya tienes cuenta? Inicia sesión" en la página de register apuntando a `/login`
- [x] 9.8 Verificar que las URLs sean `/login` y `/register` (sin el grupo `(auth)` en la URL)

## 10. Storybook

- [x] 10.1 Crear `src/components/auth/login-form.stories.tsx` con stories: `Default`, `Loading`, `WithError`
- [x] 10.2 Crear `src/components/auth/register-form.stories.tsx` con stories: `Default`, `Loading`, `WithError`
- [x] 10.3 Verificar que las stories rendericen correctamente en Storybook con los tokens CSS aplicados (verificación manual)

## 11. Verificación

- [x] 11.1 Ejecutar `pnpm build` — confirmar que el build TypeScript pasa limpio
- [x] 11.2 Navegar a `http://localhost:3001/login` — confirmar que la página renderiza
- [x] 11.3 Navegar a `http://localhost:3001/register` — confirmar que la página renderiza
- [x] 11.4 Probar validación cliente en login: email inválido y password corto — confirmar errores inline (manual)
- [x] 11.5 Probar validación cliente en register: confirmPassword no coincide — confirmar error inline (manual)
- [x] 11.6 Probar login con credenciales incorrectas — confirmar mensaje de error y password limpio (manual)
- [x] 11.7 Probar login exitoso — confirmar ambos tokens en `localStorage` y redirect a `/dashboard` (manual)
- [x] 11.8 Probar register exitoso — confirmar ambos tokens en `localStorage` y redirect a `/dashboard` (manual)
- [x] 11.9 Probar sign out — confirmar que llama a `POST /auth/logout`, limpia tokens y redirige a `/login` (manual)
- [x] 11.10 Simular access token expirado — confirmar que el interceptor llama al refresh y reintenta (manual)
- [x] 11.11 Simular refresh token expirado — confirmar redirect a `/login` y tokens limpiados (manual)
- [x] 11.12 Verificar en dark mode que la paleta Gulf Racing se aplica correctamente (manual)
