'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { registerSchema } from '@/lib/schemas/auth.schema'
import { ApiError } from '@/lib/api-client'
import { useRegister } from '@/hooks/use-auth'
import { ErrorAlert } from '@/components/auth/error-alert'
import type { RegisterFormValues } from '@/lib/schemas/auth.schema'

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const register = useRegister()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      orgName: '',
      password: '',
      confirmPassword: '',
    },
    reValidateMode: 'onBlur',
  })

  async function onSubmit(values: RegisterFormValues) {
    setApiError(null)
    const payload = {
      name: values.name,
      email: values.email,
      orgName: values.orgName,
      password: values.password,
    }
    try {
      await register.mutateAsync(payload)
      onSuccess?.()
    } catch (err) {
      form.setValue('password', '', { shouldValidate: false })
      form.setValue('confirmPassword', '', { shouldValidate: false })
      form.clearErrors()
      if (err instanceof ApiError) {
        setApiError(
          err.message === 'email_already_registered'
            ? 'Ya existe una cuenta con ese correo.'
            : err.message === 'organization_name_taken'
              ? 'Ya existe un taller registrado con ese nombre.'
              : 'Ocurrió un error. Intenta de nuevo.'
        )
      } else {
        setApiError('Ocurrió un error. Intenta de nuevo.')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input
                  placeholder='Tu nombre'
                  autoComplete='name'
                  disabled={register.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='nombre@taller.com'
                  autoComplete='email'
                  disabled={register.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='orgName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del taller</FormLabel>
              <FormControl>
                <Input
                  placeholder='Mi Taller Detailing'
                  autoComplete='organization'
                  disabled={register.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Mínimo 8 caracteres'
                    autoComplete='new-password'
                    disabled={register.isPending}
                    className='pr-10'
                    {...field}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(v => !v)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder='Repite tu contraseña'
                    autoComplete='new-password'
                    disabled={register.isPending}
                    className='pr-10'
                    {...field}
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirm(v => !v)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
                    aria-label={
                      showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    {showConfirm ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {apiError && <ErrorAlert message={apiError} />}

        <Button type='submit' className='w-full' disabled={register.isPending}>
          {register.isPending ? (
            <>
              <Loader2 size={16} className='animate-spin' />
              Creando cuenta…
            </>
          ) : (
            'Crear cuenta'
          )}
        </Button>
      </form>
    </Form>
  )
}
