export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readQuery } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { summary } from '@/lib/server/reports';
import { summaryQuerySchema } from '@/lib/server/schemas';

export const GET = handle(async (req) => {
  await authenticate(req);
  return summary(readQuery(req, summaryQuerySchema));
});
