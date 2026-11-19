import { PrismaClient } from '@prisma/client';

// Singleton (evita abrir várias conexões no hot-reload do Next.js em desenvolvimento).
const g = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = g.__prisma ?? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') g.__prisma = prisma;
