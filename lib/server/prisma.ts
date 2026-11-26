import { PrismaClient } from '@prisma/client';

// Singleton (evita abrir várias conexões no hot-reload do Next.js em desenvolvimento).
// A URL é sanitizada para remover \r\n que o Vercel CLI pode introduzir via pipe no Windows.
const g = globalThis as unknown as { __prisma?: PrismaClient };
const dbUrl = (process.env.DATABASE_URL || '').replace(/[\r\n\s'"]+/g, '').trim();
export const prisma = g.__prisma ?? new PrismaClient({ datasourceUrl: dbUrl });
if (process.env.NODE_ENV !== 'production') g.__prisma = prisma;
