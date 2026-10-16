import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Singleton (evita abrir várias conexões no hot-reload do Next.js em desenvolvimento).
const g = globalThis as unknown as { __prisma?: PrismaClient; __prismaUrl?: string };

const url = process.env.DATABASE_URL;

export const prisma =
  g.__prisma && g.__prismaUrl === url
    ? g.__prisma
    : new PrismaClient({ datasourceUrl: url });

if (process.env.NODE_ENV !== 'production') {
  g.__prisma = prisma;
  g.__prismaUrl = url;
}

