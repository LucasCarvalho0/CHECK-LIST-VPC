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

/** Logotipo Nissan fornecido (assets/nissan-logo.png ou LOGO_PATH), embutido como data URI. */
export function getLogo(): string | null {
  if (g.__logo !== undefined) return g.__logo;
  const candidates = [process.env.LOGO_PATH, ...['png', 'jpg', 'jpeg', 'svg'].map((e) => join(process.cwd(), 'assets', `nissan-logo.${e}`))];
  const file = candidates.find((p) => p && existsSync(p));
  if (!file) {
    console.warn('Logotipo Nissan não encontrado (assets/nissan-logo.png). O PDF mostrará um espaço reservado.');
    return (g.__logo = null);
  }
  const ext = extname(file).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return (g.__logo = `data:${mime};base64,${readFileSync(file).toString('base64')}`);
}

export const buildHtml = (list: PrintableChecklist[], blankSeparator = false) =>
  renderDocumentHtml(list, { blankSeparator, logo: getLogo() });

function findChromiumPath(): string | undefined {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  return candidates.find((p) => existsSync(p));
}

export async function getBrowser(): Promise<Browser> {
  if (g.__browser?.isConnected()) return g.__browser;
  const { chromium } = await import('playwright');
  const execPath = findChromiumPath();
  g.__browser = await chromium.launch({
    executablePath: execPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return g.__browser;
}

export async function closeBrowser() {
  await g.__browser?.close().catch(() => undefined);
  g.__browser = undefined;
}

export async function htmlToPdf(html: string): Promise<Buffer | null> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: true,
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  } catch (err) {
    console.warn('Chromium não disponível para renderização direta:', (err as Error).message);
    return null;
  }
}

export async function checklistPdf(id: string) {
  const row = await prisma.checklist.findFirst({ where: { id, deletedAt: null }, include: { responses: true } });
  if (!row) throw new HttpError(404, 'Checklist não encontrado.');
  const c = serializeChecklist(row) as PrintableChecklist;
  const html = buildHtml([c]);
  const pdfBuffer = await htmlToPdf(html);

  if (pdfBuffer) {
    return {
      buffer: pdfBuffer,
      filename: `checklist-${c.chassis}-${c.checklistDate}.pdf`,
      contentType: 'application/pdf',
      isHtml: false,
    };
  }

  return {
    buffer: Buffer.from(html, 'utf-8'),
    filename: `checklist-${c.chassis}-${c.checklistDate}.html`,
    contentType: 'text/html; charset=utf-8',
    isHtml: true,
  };
}

export async function dailyPdf(q: { date: string; shift?: 'FIRST' | 'SECOND'; blankSeparator?: boolean; includeInProgress?: boolean; ids?: string[] }) {
  const rows = await dailyChecklists(q);
  if (!rows.length) throw new HttpError(404, 'Nenhum checklist encontrado para os filtros informados.');
  const list = rows.map((r) => serializeChecklist(r) as PrintableChecklist);
  const html = buildHtml(list, !!q.blankSeparator);
  const pages = planPages(list.length, !!q.blankSeparator);
  const pdfBuffer = await htmlToPdf(html);

  if (pdfBuffer) {
    return {
      buffer: pdfBuffer,
      filename: `checklists-${q.date}${q.shift ? '-' + (q.shift === 'FIRST' ? '1turno' : '2turno') : ''}${q.blankSeparator ? '-duplex' : ''}.pdf`,
      contentType: 'application/pdf',
      pages,
      isHtml: false,
    };
  }

  return {
    buffer: Buffer.from(html, 'utf-8'),
    filename: `checklists-${q.date}${q.shift ? '-' + (q.shift === 'FIRST' ? '1turno' : '2turno') : ''}${q.blankSeparator ? '-duplex' : ''}.html`,
    contentType: 'text/html; charset=utf-8',
    pages,
    isHtml: true,
  };
}

export function pdfResponse(
  buffer: Buffer,
  filename: string,
  download: boolean,
  extra: Record<string, string> = {},
  contentType = 'application/pdf',
) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      ...extra,
    },
  });
}
