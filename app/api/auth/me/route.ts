export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';

export const GET = handle(async (req) => authenticate(req));
