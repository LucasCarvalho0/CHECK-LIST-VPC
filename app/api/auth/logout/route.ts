export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle } from '@/lib/server/http';

/** Token JWT é stateless: o logout descarta o token no cliente. */
export const POST = handle(async () => ({ ok: true }));
