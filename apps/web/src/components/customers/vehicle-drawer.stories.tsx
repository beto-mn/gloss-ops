import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import { VehicleDrawer } from './vehicle-drawer'

const API = 'http://localhost:4000'
const CUSTOMER_ID = 'cust-1'

const meta = {
  component: VehicleDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    customerId: CUSTOMER_ID,
  },
} satisfies Meta<typeof VehicleDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Create: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/customers/${CUSTOMER_ID}/assets`, () =>
          HttpResponse.json(
            {
              id: 'asset-1',
              customerId: CUSTOMER_ID,
              brandId: null,
              assetType: 'VEHICLE',
              customAssetType: null,
              model: 'Civic',
              year: 2022,
              identifier: null,
              country: 'MX',
              color: 'Blanco',
              note: null,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { status: 201 }
          )
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(
      body.getByRole('heading', { name: 'Agregar vehículo' })
    ).toBeVisible()
    await expect(
      body.getByRole('button', { name: /agregar vehículo/i })
    ).toBeVisible()
  },
}

export const Edit: Story = {
  args: {
    asset: {
      id: 'asset-1',
      customerId: CUSTOMER_ID,
      brandId: null,
      assetType: 'VEHICLE',
      customAssetType: null,
      model: 'Civic',
      year: 2022,
      identifier: '3VWFE21C04M000001',
      country: 'MX',
      color: 'Blanco',
      note: 'Rayón en puerta trasera',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.patch(`${API}/customers/${CUSTOMER_ID}/assets/asset-1`, () =>
          HttpResponse.json({ id: 'asset-1' })
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByText('Editar vehículo')).toBeVisible()
    await expect(
      body.getByRole('button', { name: /guardar cambios/i })
    ).toBeVisible()
  },
}
