import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LayoutDashboard } from 'lucide-react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { NavItem } from './nav-item'

const meta = {
  title: 'Layout/NavItem',
  component: NavItem,
  tags: ['ai-generated'],
  args: {
    href: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    isCollapsed: false,
  },
  decorators: [
    Story => (
      <TooltipProvider>
        <div className='w-64 p-2 bg-card border rounded-lg'>
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof NavItem>

export default meta
type Story = StoryObj<typeof meta>

export const Inactive: Story = {}

export const Active: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
  },
}

export const Collapsed: Story = {
  args: { isCollapsed: true },
  decorators: [
    Story => (
      <TooltipProvider>
        <div className='w-16 p-2 bg-card border rounded-lg flex justify-center'>
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
}
