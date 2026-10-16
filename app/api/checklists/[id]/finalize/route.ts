export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, uuid } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { finalizeChecklist } from '@/lib/server/checklists';

export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await authenticate(req, ['ADMIN', 'OPERATOR']);
  return finalizeChecklist(uuid(params.id), user);
});
