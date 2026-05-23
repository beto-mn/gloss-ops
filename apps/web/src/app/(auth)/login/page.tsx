import type { Metadata } from 'next'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'
import { RequireGuest } from '@/components/auth/require-guest'

export const metadata: Metadata = {
  title: 'Iniciar sesión — GlossOps',
}

export default function LoginPage() {
  return (
    <RequireGuest>
      <div className='w-full max-w-md space-y-4'>
        <Card className='shadow-md border-t-2 border-t-secondary/60 dark:border-t-secondary/40'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold'>Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder a tu taller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <p className='text-sm text-center text-muted-foreground'>
          ¿No tienes cuenta?{' '}
          <Link
            href='/register'
            className='text-secondary dark:text-accent hover:underline font-medium'
          >
            Regístrate
          </Link>
        </p>
      </div>
    </RequireGuest>
  )
}
