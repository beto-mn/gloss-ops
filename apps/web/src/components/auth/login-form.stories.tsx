import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import { LoginForm } from './login-form'

const API = 'http://localhost:4000'

const meta = {
  component: LoginForm,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
  args: { onSuccess: () => {} },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

function fill(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set
  set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: /iniciar sesión/i })
    ).toBeVisible()
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [http.post(`${API}/auth/login`, () => new Promise(() => {}))],
    },
  },
  play: async ({ canvasElement }) => {
    const email = canvasElement.querySelector(
      'input[type="email"]'
    ) as HTMLInputElement
    const password = canvasElement.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement
    const submit = canvasElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement
    fill(email, 'ana@taller.com')
    fill(password, 'password123')
    submit.click()
  },
}

export const WithError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/auth/login`, () =>
          HttpResponse.json(
            { error: 'invalid_credentials', statusCode: 401 },
            { status: 401 }
          )
        ),
      ],
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const email = canvasElement.querySelector(
      'input[type="email"]'
    ) as HTMLInputElement
    const password = canvasElement.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement
    const submit = canvasElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement
    fill(email, 'ana@taller.com')
    fill(password, 'wrongpassword')
    submit.click()
    await expect(
      await canvas.findByText('Correo o contraseña incorrectos')
    ).toBeVisible()
  },
}
