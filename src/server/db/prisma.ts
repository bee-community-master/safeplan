import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { safeplanPrisma?: PrismaClient };

export function prismaClient(): PrismaClient {
  if (!globalForPrisma.safeplanPrisma) {
    globalForPrisma.safeplanPrisma = new PrismaClient({
      log: process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error']
    });
  }
  return globalForPrisma.safeplanPrisma;
}
