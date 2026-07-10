import { z } from 'zod'

import { LoginSchema, RegisterSchema } from '@glossops/shared'

/**
 * Web login form schema. Composes the shared `LoginSchema` field shape and
 * layers web-only UX concerns: a minimum password length and Spanish error
 * messages. The field shape itself is owned by `@glossops/shared`.
 */
export const loginSchema = LoginSchema.extend({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

/**
 * Web register form schema. Composes the shared `RegisterSchema` field shape
 * (email/password/name/orgName) and layers the web-only cross-field
 * `confirmPassword` match rule plus Spanish error messages. `RegisterSchema`
 * stays refinement-free in `@glossops/shared`; the refinement lives here.
 */
export const registerSchema = RegisterSchema.extend({
  email: z.string().email('Ingresa un correo válido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  orgName: z
    .string()
    .min(2, 'El nombre del taller debe tener al menos 2 caracteres'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export type RegisterFormValues = z.infer<typeof registerSchema>
