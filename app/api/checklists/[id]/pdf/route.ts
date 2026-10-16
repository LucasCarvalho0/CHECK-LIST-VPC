export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { handle, uuid } from '@/lib/server/http';
import { authenticate } from '@/lib/server/auth';
import { checklistPdf, pdfResponse } from '@/lib/server/pdf';

/** ?download=1 força download; sem ele o PDF abre inline (pré-visualização/impressão). */
export const GET = handle(async (req, { params }: { params: { id: string } }) => {
  await authenticate(req);
  const { buffer, filename, contentType } = await checklistPdf(uuid(params.id));
  return pdfResponse(buffer, filename, new URL(req.url).searchParams.has('download'), {
    'Content-Type': contentType,
  });
});
