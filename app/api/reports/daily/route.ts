export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readQuery } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { daily } from '@/lib/server/reports';
import { dailyQuerySchema } from '@/lib/server/schemas';
import { resolveEffectiveShift } from '@/lib/shared/shifts';

export const GET = handle(async (req) => {
  const user = await authenticate(req);
  const q = readQuery(req, dailyQuerySchema);
  q.shift = resolveEffectiveShift(user, q.shift);
  return daily(q);
});
