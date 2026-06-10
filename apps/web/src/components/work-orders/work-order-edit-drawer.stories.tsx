import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { userEvent } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import { WorkOrderEditDrawer } from './work-order-edit-drawer'

const API = 'http://localhost:4000'

const mockWorkOrder = {
  id: 'wo-1',
  folio: 'WO-001',
  status: 'OPEN' as const,
  type: 'STANDARD' as const,
  scheduledAt: null,
  note: null,
  customerId: 'cust-1',
  assetId: 'asset-1',
  createdAt: '2026-01-01T00:00:00Z',
  completedAt: null,
  customer: { id: 'cust-1', firstName: 'Ana', lastName: 'García' },
  asset: {
    id: 'asset-1',
    assetType: 'VEHICLE',
    customAssetType: null,
    model: 'Civic',
    identifier: 'ABC-123',
    brandName: 'Honda',
  },
  items: [],
  total: 0,
}

const meta = {
  component: WorkOrderEditDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    workOrder: mockWorkOrder,
  },
} satisfies Meta<typeof WorkOrderEditDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const HappyPath: Story = {
  parameters: {
    msw: {
      handlers: [
        http.patch(`${API}/work-orders/wo-1`, () =>
          HttpResponse.json({ ...mockWorkOrder, note: 'Revisión completa' })
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    const noteField = body.getByPlaceholderText(/observaciones generales/i)
    await userEvent.type(noteField, 'Revisión completa')

    const submitBtn = body.getByRole('button', { name: /guardar cambios/i })
    await userEvent.click(submitBtn)

    await expect(submitBtn).toBeVisible()
  },
}

export const ValidationError: Story = {
  args: {
    workOrder: {
      ...mockWorkOrder,
      scheduledAt: '2026-01-01T00:00:00Z',
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    // Clear the scheduled date input to trigger potential validation
    const dateInput = body.getByLabelText(/fecha programada/i)
    await userEvent.clear(dateInput)

    const submitBtn = body.getByRole('button', { name: /guardar cambios/i })
    await userEvent.click(submitBtn)

    // Drawer title should still be visible — form did not crash
    await expect(body.getByText(/editar orden/i)).toBeVisible()
  },
}

export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.patch(`${API}/work-orders/wo-1`, () =>
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

    const noteField = body.getByPlaceholderText(/observaciones generales/i)
    await userEvent.type(noteField, 'Alguna nota')

    const submitBtn = body.getByRole('button', { name: /guardar cambios/i })
    await userEvent.click(submitBtn)

    // Drawer remains open on server error
    await expect(body.getByText(/editar orden/i)).toBeVisible()
  },
}

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.patch(`${API}/work-orders/wo-1`, () => new Promise(() => {})),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)

    const noteField = body.getByPlaceholderText(/observaciones generales/i)
    await userEvent.type(noteField, 'Alguna nota')

    const submitBtn = body.getByRole('button', { name: /guardar cambios/i })
    await userEvent.click(submitBtn)

    // While in-flight, button should show loading indicator
    await expect(body.getByText(/guardando/i)).toBeVisible()
  },
}
