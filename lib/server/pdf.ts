import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import type { Browser } from 'playwright';
import { prisma } from './prisma';
import { HttpError } from './http';
import { dailyChecklists } from './reports';
import { planPages } from './page-plan';
import { serializeChecklist } from './mapper';
import { PrintableChecklist, renderDocumentHtml } from './pdf-template';

const g = globalThis as unknown as { __browser?: Browser; __logo?: string | null };
// Se houver cache nulo ou inválido em memória, limpa imediatamente
if (!g.__logo) g.__logo = undefined;

/** Logotipo Nissan fornecido (nissan.webp, assets/nissan-logo.* ou LOGO_PATH), embutido como data URI. */
export function getLogo(): string | null {
  if (g.__logo) return g.__logo;
  const candidates = [
    process.env.LOGO_PATH,
    join(process.cwd(), 'assets', 'nissan.png'),
    join(process.cwd(), 'assets', 'nissan-logo.png'),
    join(process.cwd(), 'public', 'nissan.png'),
    join(process.cwd(), 'nissan.png'),
    join(process.cwd(), 'assets', 'nissan.webp'),
    join(process.cwd(), 'assets', 'nissan-logo.webp'),
    join(process.cwd(), 'public', 'nissan.webp'),
    join(process.cwd(), 'nissan.webp'),
    ...['png', 'webp', 'jpg', 'jpeg', 'svg'].map((e) => join(process.cwd(), 'assets', `nissan-logo.${e}`)),
  ];
  const file = candidates.find((p) => p && existsSync(p));
  if (!file) {
    console.warn('Logotipo Nissan não encontrado. O PDF mostrará um espaço reservado.');
    return null;
  }
  const ext = extname(file).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : `image/${ext}`;
  const dataUri = `data:${mime};base64,${readFileSync(file).toString('base64')}`;
  g.__logo = dataUri;
  return dataUri;
}

export const buildHtml = (list: PrintableChecklist[], blankSeparator = false) =>
  renderDocumentHtml(list, { blankSeparator, logo: getLogo() });

function findChromiumPath(): string | undefined {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  const defaultPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return defaultPaths.find((p) => existsSync(p));
}

export async function getBrowser(): Promise<Browser> {
  if (g.__browser?.isConnected()) return g.__browser;
  try {
    const { chromium } = await import('playwright');
    const executablePath = findChromiumPath();
    g.__browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
    return g.__browser;
  } catch (e) {
    console.error('Falha ao iniciar o Chromium:', (e as Error).message);
    throw new HttpError(503, 'Geração de PDF indisponível: instale o Chromium (npm run browsers:install) ou defina CHROMIUM_PATH.');
  }
}

export async function closeBrowser() {
  await g.__browser?.close().catch(() => undefined);
  g.__browser = undefined;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function checklistPdf(id: string) {
  const row = await prisma.checklist.findFirst({ where: { id, deletedAt: null }, include: { responses: true } });
  if (!row) throw new HttpError(404, 'Checklist não encontrado.');
  const c = serializeChecklist(row) as PrintableChecklist;
  return { buffer: await htmlToPdf(buildHtml([c])), filename: `checklist-${c.chassis}-${c.checklistDate}.pdf` };
}

export async function dailyPdf(q: { date: string; shift?: 'FIRST' | 'SECOND'; blankSeparator?: boolean; includeInProgress?: boolean; ids?: string[] }) {
  const rows = await dailyChecklists(q);
  if (!rows.length) throw new HttpError(404, 'Nenhum checklist encontrado para os filtros informados.');
  const list = rows.map((r) => serializeChecklist(r) as PrintableChecklist);
  return {
    buffer: await htmlToPdf(buildHtml(list, !!q.blankSeparator)),
    filename: `checklists-${q.date}${q.shift ? '-' + (q.shift === 'FIRST' ? '1turno' : '2turno') : ''}${q.blankSeparator ? '-duplex' : ''}.pdf`,
    pages: planPages(list.length, !!q.blankSeparator),
  };
}

export function pdfResponse(buffer: Buffer, filename: string, download: boolean, extra: Record<string, string> = {}) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      ...extra,
    },
  });
}
