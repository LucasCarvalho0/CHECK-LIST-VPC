export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readQuery } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { daily } from '@/lib/server/reports';
import { dailyQuerySchema } from '@/lib/server/schemas';

export const GET = handle(async (req) => {
  await authenticate(req);
  return daily(readQuery(req, dailyQuerySchema));
});
