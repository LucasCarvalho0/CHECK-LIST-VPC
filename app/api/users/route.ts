export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { createUser, listUsers } from '@/lib/server/users';
import { createUserSchema } from '@/lib/server/schemas';

export const GET = handle(async (req) => {
  await authenticate(req, ['ADMIN']);
  return listUsers();
});

export const POST = handle(async (req) => {
  await authenticate(req, ['ADMIN']);
  return Response.json(await createUser(await readBody(req, createUserSchema)), { status: 201 });
});
