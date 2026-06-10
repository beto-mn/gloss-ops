import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { userEvent } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import { CustomerDrawer } from './customer-drawer'

const API = 'http://localhost:4000'

const meta = {
  component: CustomerDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof CustomerDrawer>

export default meta
type Story = StoryObj<typeof meta>

const mockCreatedCustomer = {
  id: 'cust-1',
  organizationId: 'org-1',
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@ejemplo.com',
  phone: null,
  address: null,
  taxId: null,
  fiscalRegime: null,
  zipCode: null,
  source: null,
  note: null,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activeWorkOrderCount: 0,
}

export const Create: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/customers`, () =>
          HttpResponse.json(mockCreatedCustomer, { status: 201 })
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    await expect(body.getByText('Nuevo cliente')).toBeVisible()

    const firstNameInput = body.getByPlaceholderText('Ana')
    await userEvent.type(firstNameInput, 'Ana')

    const lastNameInput = body.getByPlaceholderText('García')
    await userEvent.type(lastNameInput, 'García')

    const emailInput = body.getByPlaceholderText('ana@ejemplo.com')
    await userEvent.type(emailInput, 'ana@ejemplo.com')

    const submitBtn = body.getByRole('button', { name: /crear cliente/i })
    await userEvent.click(submitBtn)

    await expect(submitBtn).toBeVisible()
  },
}

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    // Submit without required firstName / lastName
    const submitBtn = body.getByRole('button', { name: /crear cliente/i })
    await userEvent.click(submitBtn)

    await expect(await body.findByText('El nombre es requerido')).toBeVisible()
  },
}

export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/customers`, () =>
          HttpResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
          )
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    const firstNameInput = body.getByPlaceholderText('Ana')
    await userEvent.type(firstNameInput, 'Ana')

    const lastNameInput = body.getByPlaceholderText('García')
    await userEvent.type(lastNameInput, 'García')

    const submitBtn = body.getByRole('button', { name: /crear cliente/i })
    await userEvent.click(submitBtn)

    // Drawer should remain open on server error
    await expect(body.getByText('Nuevo cliente')).toBeVisible()
  },
}

export const Edit: Story = {
  args: {
    customer: {
      id: 'cust-1',
      organizationId: 'org-1',
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@ejemplo.com',
      phone: '5551234567',
      address: 'Calle Reforma 100',
      taxId: 'GAAA800101AAA',
      fiscalRegime: 'Persona física',
      zipCode: '06600',
      source: 'Instagram',
      note: 'Cliente frecuente',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeWorkOrderCount: 2,
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.patch(`${API}/customers/cust-1`, () =>
          HttpResponse.json({ id: 'cust-1' })
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByText('Editar cliente')).toBeVisible()
    await expect(
      body.getByRole('button', { name: /guardar cambios/i })
    ).toBeVisible()
  },
}
