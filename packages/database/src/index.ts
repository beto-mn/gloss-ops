// Set __dirname for Prisma runtime path resolution (CJS-compatible bypass of generated client.ts)
if (typeof globalThis['__dirname'] === 'undefined') {
  globalThis['__dirname'] = __dirname
}

import { getPrismaClientClass } from '../generated/prisma/internal/class'
export type { PrismaClient } from '../generated/prisma/internal/class'

export const PrismaClient = getPrismaClientClass()

export * from '../generated/prisma/enums'
