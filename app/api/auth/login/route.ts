export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody } from '@/lib/server/http';
import { login } from '@/lib/server/auth';
import { loginSchema } from '@/lib/server/schemas';

export const POST = handle(async (req) => {
  const dto = await readBody(req, loginSchema);
  return login(req, dto.username, dto.password);
});
