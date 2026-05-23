import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import { RegisterForm } from './register-form'

const API = 'http://localhost:4000'

const meta = {
  component: RegisterForm,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
  args: { onSuccess: () => {} },
} satisfies Meta<typeof RegisterForm>

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

function fillForm(canvasElement: HTMLElement) {
  const inputs = canvasElement.querySelectorAll('input')
  fill(inputs[0] as HTMLInputElement, 'Ana García')
  fill(inputs[1] as HTMLInputElement, 'ana@taller.com')
  fill(inputs[2] as HTMLInputElement, 'Mi Taller Detailing')
  fill(inputs[3] as HTMLInputElement, 'password123')
  fill(inputs[4] as HTMLInputElement, 'password123')
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: /crear cuenta/i })
    ).toBeVisible()
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/auth/register`, () => new Promise(() => {})),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    fillForm(canvasElement)
    const submit = canvasElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement
    submit.click()
  },
}

export const WithEmailError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/auth/register`, () =>
          HttpResponse.json(
            { error: 'email_already_registered', statusCode: 409 },
            { status: 409 }
          )
        ),
      ],
    },
  },
  play: async ({ canvas, canvasElement }) => {
    fillForm(canvasElement)
    const submit = canvasElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement
    submit.click()
    await expect(
      await canvas.findByText('Ya existe una cuenta con ese correo.')
    ).toBeVisible()
  },
}

export const WithOrgNameError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/auth/register`, () =>
          HttpResponse.json(
            { error: 'organization_name_taken', statusCode: 409 },
            { status: 409 }
          )
        ),
      ],
    },
  },
  play: async ({ canvas, canvasElement }) => {
    fillForm(canvasElement)
    const submit = canvasElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement
    submit.click()
    await expect(
      await canvas.findByText('Ya existe un taller registrado con ese nombre.')
    ).toBeVisible()
  },
}
