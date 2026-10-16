export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, readBody } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { dailyPdf, pdfResponse } from '@/lib/server/pdf';
import { dailyPdfSchema } from '@/lib/server/schemas';

export const POST = handle(async (req) => {
  await authenticate(req);
  const { buffer, filename, pages, contentType } = await dailyPdf(await readBody(req, dailyPdfSchema));
  return pdfResponse(buffer, filename, new URL(req.url).searchParams.has('download'), {
    'Content-Type': contentType,
    'X-Total-Pages': String(pages.totalPages), 'X-Total-Vehicles': String(pages.vehicles),
  });
});
