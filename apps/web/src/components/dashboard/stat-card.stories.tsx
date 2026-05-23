import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ClipboardList } from 'lucide-react'

import { StatCard } from './stat-card'

const meta = {
  title: 'Dashboard/StatCard',
  component: StatCard,
  tags: ['ai-generated'],
  args: {
    title: 'Órdenes hoy',
    icon: ClipboardList,
  },
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Skeleton: Story = {}

export const WithValue: Story = {
  args: { value: 12 },
}

export const WithStringValue: Story = {
  args: { value: '$24,500' },
}
