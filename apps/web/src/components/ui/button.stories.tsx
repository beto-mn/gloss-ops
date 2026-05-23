import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { Loader2, LogOut } from 'lucide-react'

import { Button } from './button'

const meta = {
  component: Button,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { children: 'Iniciar sesión' },
  play: async ({ canvas }) => {
    const btn = canvas.getByRole('button', { name: /iniciar sesión/i })
    await expect(btn).toBeVisible()
    await expect(btn).not.toBeDisabled()
  },
}

// bg-primary = #F06432 = rgb(240, 100, 50) — fails if Tailwind/CSS did not load
export const CssCheck: Story = {
  args: { children: 'Submit' },
  play: async ({ canvas }) => {
    const btn = canvas.getByRole('button', { name: /submit/i })
    await expect(getComputedStyle(btn).backgroundColor).toBe(
      'rgb(240, 100, 50)'
    )
  },
}

export const Destructive: Story = {
  args: { children: 'Eliminar', variant: 'destructive' },
}

export const Outline: Story = {
  args: { children: 'Cancelar', variant: 'outline' },
}

export const Ghost: Story = {
  args: { children: 'Omitir', variant: 'ghost' },
}

export const Loading: Story = {
  args: {
    children: (
      <>
        <Loader2 size={16} className='animate-spin' />
        Guardando…
      </>
    ),
    disabled: true,
  },
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <LogOut size={16} strokeWidth={1.5} />
        Cerrar sesión
      </>
    ),
    variant: 'outline',
  },
}

export const Small: Story = {
  args: { children: 'Pequeño', size: 'sm' },
}

export const Large: Story = {
  args: { children: 'Grande', size: 'lg' },
}
