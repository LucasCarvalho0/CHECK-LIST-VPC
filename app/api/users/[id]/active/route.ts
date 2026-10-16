export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody, uuid } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { setUserActive } from '@/lib/server/users';
import { setActiveSchema } from '@/lib/server/schemas';

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const me = await authenticate(req, ['ADMIN']);
  return setUserActive(uuid(params.id), (await readBody(req, setActiveSchema)).active, me.id);
});
