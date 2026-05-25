import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
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

export const Create: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/customers`, () =>
          HttpResponse.json(
            {
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
            },
            { status: 201 }
          )
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByText('Nuevo cliente')).toBeVisible()
    await expect(
      body.getByRole('button', { name: /crear cliente/i })
    ).toBeVisible()
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
