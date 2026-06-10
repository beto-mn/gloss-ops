import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { userEvent } from 'storybook/test'
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
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    const emailInput = body.getByLabelText(/correo electrónico/i)
    await userEvent.type(emailInput, 'ana@taller.com')

    const passwordInput = body.getByLabelText(/contraseña/i)
    await userEvent.type(passwordInput, 'password123')

    // No validation errors should appear after typing valid values
    await expect(
      body.getByRole('button', { name: /iniciar sesión/i })
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

export const ValidationError: Story = {
  play: async ({ canvas, canvasElement }) => {
    const form = canvasElement.querySelector('form') as HTMLFormElement
    const email = canvasElement.querySelector(
      'input[type="email"]'
    ) as HTMLInputElement
    const submit = canvasElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement
    // Disable browser native HTML5 validation so RHF+Zod handles it instead
    form.setAttribute('novalidate', 'true')
    fill(email, 'not-an-email')
    submit.click()
    await expect(
      await canvas.findByText('Ingresa un correo válido')
    ).toBeVisible()
  },
}

export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/auth/login`, () =>
          HttpResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
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
    fill(password, 'password123')
    submit.click()
    await expect(
      await canvas.findByText('Ocurrió un error. Intenta de nuevo.')
    ).toBeVisible()
  },
}
