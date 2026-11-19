export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody, readQuery } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { createChecklist, listChecklists } from '@/lib/server/checklists';
import { createChecklistSchema, listChecklistsSchema } from '@/lib/server/schemas';

export const GET = handle(async (req) => {
  await authenticate(req);
  return listChecklists(readQuery(req, listChecklistsSchema));
});

export const POST = handle(async (req) => {
  const user = await authenticate(req, ['ADMIN', 'OPERATOR']);
  return Response.json(await createChecklist(await readBody(req, createChecklistSchema), user), { status: 201 });
});
