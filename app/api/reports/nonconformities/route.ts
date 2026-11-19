export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readQuery } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { nonconformities } from '@/lib/server/reports';
import { nonconformityQuerySchema } from '@/lib/server/schemas';

export const GET = handle(async (req) => {
  await authenticate(req);
  return nonconformities(readQuery(req, nonconformityQuerySchema));
});
