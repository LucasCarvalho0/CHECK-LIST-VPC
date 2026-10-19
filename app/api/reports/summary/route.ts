export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readQuery } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { summary } from '@/lib/server/reports';
import { summaryQuerySchema } from '@/lib/server/schemas';
import { resolveEffectiveShift } from '@/lib/shared/shifts';

export const GET = handle(async (req) => {
  const user = await authenticate(req);
  const q = readQuery(req, summaryQuerySchema);
  q.shift = resolveEffectiveShift(user, q.shift);
  return summary(q);
});
