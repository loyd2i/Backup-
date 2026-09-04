import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client instance
const prismaClient = globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient

// Export database client with both names for backwards compatibility
export const db = prismaClient
export const prisma = prismaClient
