import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { userEvent } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import { ServiceDrawer } from './service-drawer'

const API = 'http://localhost:4000'

const mockService = {
  id: 'svc-1',
  name: 'Pulido completo',
  description: 'Pulido de carrocería completo',
  basePrice: 1500,
  warrantyDays: 30,
  isActive: true,
  claveProdServ: null,
  claveUnidad: null,
}

const meta = {
  component: ServiceDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof ServiceDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const HappyPath: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/services`, () =>
          HttpResponse.json(mockService, { status: 201 })
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    const nameInput = body.getByPlaceholderText(/aplicación de vinilo/i)
    await userEvent.type(nameInput, 'Pulido completo')

    const priceInput = body.getByLabelText(/precio/i)
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '1500')

    const warrantyInput = body.getByLabelText(/días de garantía/i)
    await userEvent.clear(warrantyInput)
    await userEvent.type(warrantyInput, '30')

    const submitBtn = body.getByRole('button', { name: /crear servicio/i })
    await userEvent.click(submitBtn)

    await expect(submitBtn).toBeVisible()
  },
}

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    const submitBtn = body.getByRole('button', { name: /crear servicio/i })
    await userEvent.click(submitBtn)

    await expect(await body.findByText('El nombre es requerido')).toBeVisible()
  },
}

export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/services`, () =>
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

    const nameInput = body.getByPlaceholderText(/aplicación de vinilo/i)
    await userEvent.type(nameInput, 'Pulido completo')

    const priceInput = body.getByLabelText(/precio/i)
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '1500')

    const warrantyInput = body.getByLabelText(/días de garantía/i)
    await userEvent.clear(warrantyInput)
    await userEvent.type(warrantyInput, '30')

    const submitBtn = body.getByRole('button', { name: /crear servicio/i })
    await userEvent.click(submitBtn)

    // The form should remain visible (drawer did not close on error)
    await expect(body.getByText('Nuevo servicio')).toBeVisible()
  },
}

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [http.post(`${API}/services`, () => new Promise(() => {}))],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    const nameInput = body.getByPlaceholderText(/aplicación de vinilo/i)
    await userEvent.type(nameInput, 'Pulido completo')

    const priceInput = body.getByLabelText(/precio/i)
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '1500')

    const warrantyInput = body.getByLabelText(/días de garantía/i)
    await userEvent.clear(warrantyInput)
    await userEvent.type(warrantyInput, '30')

    const submitBtn = body.getByRole('button', { name: /crear servicio/i })
    await userEvent.click(submitBtn)

    // While request is in-flight, submit button should show loading state
    await expect(body.getByText(/guardando/i)).toBeVisible()
  },
}
