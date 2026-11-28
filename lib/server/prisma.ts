import { PrismaClient } from '@prisma/client';

// Singleton para desenvolvimento e produção serverless (reutiliza conexões em lambdas aquecidos).
// A URL é sanitizada para remover \r\n que o Vercel CLI pode introduzir via pipe no Windows.
const g = globalThis as unknown as { __prisma?: PrismaClient };
const dbUrl = (process.env.DATABASE_URL || '').replace(/[\r\n\s'"]+/g, '').trim();
export const prisma = g.__prisma ?? (g.__prisma = new PrismaClient({ datasourceUrl: dbUrl }));
