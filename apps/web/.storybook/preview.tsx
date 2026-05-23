import React from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initialize, mswLoader } from 'msw-storybook-addon'
import type { Preview } from '@storybook/nextjs-vite'

import '../src/app/globals.css'
import { mswHandlers } from './msw-handlers'

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    nextjs: { appDirectory: true },
    msw: { handlers: mswHandlers },
  },
  decorators: [
    Story => (
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem={false}
        >
          <Story />
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
}

export default preview
