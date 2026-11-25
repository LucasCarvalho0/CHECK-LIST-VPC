export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/server/prisma';

export async function GET() {
  try {
    // Executa uma consulta leve para acordar e manter aquecida a conexão com o banco PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ status: 'waking_up', error: (error as Error)?.message }, { status: 503 });
  }
}
