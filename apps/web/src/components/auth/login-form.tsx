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
import { loginSchema } from '@/lib/schemas/auth.schema'
import { ApiError } from '@/lib/api-client'
import { useLogin } from '@/hooks/use-auth'
import { ErrorAlert } from '@/components/auth/error-alert'
import type { LoginFormValues } from '@/lib/schemas/auth.schema'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const login = useLogin()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    reValidateMode: 'onBlur',
  })

  async function onSubmit(values: LoginFormValues) {
    setApiError(null)
    try {
      await login.mutateAsync(values)
      onSuccess?.()
    } catch (err) {
      form.setValue('password', '', { shouldValidate: false })
      form.clearErrors()
      form.setFocus('email')
      if (err instanceof ApiError) {
        setApiError(
          err.message === 'invalid_credentials'
            ? 'Correo o contraseña incorrectos'
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
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='nombre@taller.com'
                  autoComplete='email'
                  disabled={login.isPending}
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
                    placeholder='••••••••'
                    autoComplete='current-password'
                    disabled={login.isPending}
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

        {apiError && <ErrorAlert message={apiError} />}

        <Button type='submit' className='w-full' disabled={login.isPending}>
          {login.isPending ? (
            <>
              <Loader2 size={16} className='animate-spin' />
              Iniciando sesión…
            </>
          ) : (
            'Iniciar sesión'
          )}
        </Button>
      </form>
    </Form>
  )
}
