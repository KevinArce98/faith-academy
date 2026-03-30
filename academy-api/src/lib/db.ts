import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildConnectionString(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('sslmode', 'verify-full');
  return parsed.toString();
}

function createPrismaClient() {
  const connectionString = buildConnectionString(process.env.DATABASE_URL!);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Type for Prisma interactive transaction client (Prisma 7 compatibility)
export type DbClient = typeof db;
