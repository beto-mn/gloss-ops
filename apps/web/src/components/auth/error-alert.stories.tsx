import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'

import { ErrorAlert } from './error-alert'

const meta = {
  component: ErrorAlert,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
  decorators: [
    Story => (
      <div className='w-80'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorAlert>

export default meta
type Story = StoryObj<typeof meta>

export const InvalidCredentials: Story = {
  args: { message: 'Correo o contraseña incorrectos' },
  play: async ({ canvas }) => {
    const alert = canvas.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveTextContent('Correo o contraseña incorrectos')
  },
}

export const EmailAlreadyRegistered: Story = {
  args: { message: 'Ya existe una cuenta con ese correo.' },
}

export const OrgNameTaken: Story = {
  args: { message: 'Ya existe un taller registrado con ese nombre.' },
}

export const GenericError: Story = {
  args: { message: 'Ocurrió un error. Intenta de nuevo.' },
}
