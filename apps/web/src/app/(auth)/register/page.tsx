import type { Metadata } from 'next'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RegisterForm } from '@/components/auth/register-form'
import { RequireGuest } from '@/components/auth/require-guest'

export const metadata: Metadata = {
  title: 'Crear cuenta — GlossOps',
}

export default function RegisterPage() {
  return (
    <RequireGuest>
      <div className='w-full max-w-md space-y-4'>
        <Card className='shadow-md border-t-2 border-t-secondary/60 dark:border-t-secondary/40'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold'>Crear cuenta</CardTitle>
            <CardDescription>
              Registra tu taller y empieza a operar en minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>

        <p className='text-sm text-center text-muted-foreground'>
          ¿Ya tienes cuenta?{' '}
          <Link
            href='/login'
            className='text-secondary dark:text-accent hover:underline font-medium'
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </RequireGuest>
  )
}
