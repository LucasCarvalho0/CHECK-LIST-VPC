export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody, uuid } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { getChecklist, updateChecklist } from '@/lib/server/checklists';
import { updateChecklistSchema } from '@/lib/server/schemas';

type Ctx = { params: { id: string } };

export const GET = handle(async (req, { params }: Ctx) => {
  await authenticate(req);
  return getChecklist(uuid(params.id));
});

// A regra fina (finalizado => só ADMIN; VIEWER nunca) é aplicada no service.
export const PATCH = handle(async (req, { params }: Ctx) => {
  const user = await authenticate(req, ['ADMIN', 'OPERATOR']);
  return updateChecklist(uuid(params.id), await readBody(req, updateChecklistSchema), user);
});
