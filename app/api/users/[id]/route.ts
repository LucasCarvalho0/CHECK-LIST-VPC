export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody, uuid } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { updateUser } from '@/lib/server/users';
import { updateUserSchema } from '@/lib/server/schemas';

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const me = await authenticate(req, ['ADMIN']);
  return updateUser(uuid(params.id), await readBody(req, updateUserSchema), me.id);
});
