// Set __dirname for Prisma runtime path resolution (CJS-compatible bypass of generated client.ts)
if (typeof globalThis['__dirname'] === 'undefined') {
  globalThis['__dirname'] = __dirname
}

import { getPrismaClientClass } from '../generated/prisma/internal/class'

// PrismaClient value (constructor) and PrismaClient type (instance) share the same name
export const PrismaClient = getPrismaClientClass()
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type PrismaClient = InstanceType<typeof PrismaClient>

export * from '../generated/prisma/enums'
