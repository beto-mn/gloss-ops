// Set __dirname for Prisma runtime path resolution (CJS-compatible bypass of generated client.ts)
if (!('__dirname' in globalThis)) {
  Object.assign(globalThis, { __dirname })
}

import { getPrismaClientClass } from '../generated/prisma/internal/class'

// PrismaClient value (constructor) and PrismaClient type (instance) share the same name
export const PrismaClient = getPrismaClientClass()
export type PrismaClient = InstanceType<typeof PrismaClient>

export * from '../generated/prisma/enums'
export * as Prisma from '../generated/prisma/internal/prismaNamespace'
