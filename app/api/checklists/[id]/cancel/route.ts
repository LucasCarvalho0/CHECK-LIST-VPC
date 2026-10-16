export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody, uuid } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { cancelChecklist } from '@/lib/server/checklists';
import { cancelSchema } from '@/lib/server/schemas';

export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await authenticate(req, ['ADMIN']);
  return cancelChecklist(uuid(params.id), (await readBody(req, cancelSchema)).reason, user);
});
