export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { searchByChassis } from '@/lib/server/checklists';

export const GET = handle(async (req, { params }: { params: { chassis: string } }) => {
  await authenticate(req);
  return searchByChassis(decodeURIComponent(params.chassis));
});
