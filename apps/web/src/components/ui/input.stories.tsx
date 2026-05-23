import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Input } from './input'

const meta = {
  component: Input,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
  decorators: [
    Story => (
      <div className='w-72'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { placeholder: 'Escribe algo…' },
}

export const Email: Story = {
  args: { type: 'email', placeholder: 'nombre@taller.com' },
}

export const Password: Story = {
  args: { type: 'password', placeholder: '••••••••' },
}

export const Disabled: Story = {
  args: { placeholder: 'Deshabilitado', disabled: true },
}

export const WithValue: Story = {
  args: { defaultValue: 'ana@taller.com', type: 'email' },
}
