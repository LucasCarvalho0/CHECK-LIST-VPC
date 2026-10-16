export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, uuid } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { checklistHistory } from '@/lib/server/checklists';

export const GET = handle(async (req, { params }: { params: { id: string } }) => {
  await authenticate(req, ['ADMIN']);
  return checklistHistory(uuid(params.id));
});
