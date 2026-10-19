export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { dailyPdf, pdfResponse } from '@/lib/server/pdf';
import { dailyPdfSchema } from '@/lib/server/schemas';
import { resolveEffectiveShift } from '@/lib/shared/shifts';

export const POST = handle(async (req) => {
  const user = await authenticate(req);
  const body = await readBody(req, dailyPdfSchema);
  body.shift = resolveEffectiveShift(user, body.shift);
  const { buffer, filename, pages, contentType } = await dailyPdf(body);
  return pdfResponse(buffer, filename, new URL(req.url).searchParams.has('download'), {
    'Content-Type': contentType,
    'X-Total-Pages': String(pages.totalPages), 'X-Total-Vehicles': String(pages.vehicles),
  });
});
