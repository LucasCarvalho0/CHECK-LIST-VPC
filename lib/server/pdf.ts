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
// Sempre invalida cache ao inicializar
g.__logo = undefined;

/** Logotipo SESÉ QA fornecido (grupo-sese.png, grupo-cce.png, cce.png ou LOGO_PATH), embutido como data URI. */
export function getLogo(): string | null {
  if (g.__logo) return g.__logo;
  const candidates = [
    process.env.LOGO_PATH,
    join(process.cwd(), 'public', 'grupo-sese.png'),
    join(process.cwd(), 'public', 'grupo-cce.png'),
    join(process.cwd(), 'public', 'cce.png'),
    join(process.cwd(), 'Grupo-Sesé.png'),
    join(process.cwd(), 'assets', 'grupo-sese.png'),
    join(process.cwd(), 'assets', 'grupo-cce.png'),
    join(process.cwd(), 'assets', 'nissan.png'),
    join(process.cwd(), 'public', 'nissan.png'),
    join(process.cwd(), 'nissan.png'),
  ];
  const file = candidates.find((p) => p && existsSync(p));
  if (!file) {
    console.warn('Logotipo não encontrado. O PDF mostrará um espaço reservado.');
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
    throw new Error('Chromium não disponível');
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

function addPrintToolbar(html: string, title: string): string {
  const toolbar = `
    <div id="print-toolbar" style="position:fixed; top:0; left:0; right:0; background:#0f172a; color:#fff; padding:10px 20px; display:flex; align-items:center; justify-content:space-between; z-index:99999; box-shadow:0 2px 10px rgba(0,0,0,0.3); font-family:sans-serif;">
      <span style="font-size:14px; font-weight:600;">🖨️ ${title} &mdash; Pré-visualização para Impressão</span>
      <div style="display:flex; gap:10px;">
        <button onclick="window.print()" style="background:#C3002F; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; box-shadow:0 2px 4px rgba(0,0,0,0.2);">Imprimir / Salvar em PDF</button>
        <button onclick="window.close()" style="background:#334155; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-size:13px;">Fechar</button>
      </div>
    </div>
    <style>
      @media screen {
        body { padding-top: 55px !important; background: #cbd5e1 !important; }
        .page { margin: 15px auto !important; box-shadow: 0 4px 15px rgba(0,0,0,0.15) !important; }
      }
      @media print {
        #print-toolbar { display: none !important; }
        body { padding-top: 0 !important; background: #fff !important; }
      }
    </style>
  `;
  return html.replace('</body>', `${toolbar}</body>`);
}

export async function checklistPdf(id: string) {
  const row = await prisma.checklist.findFirst({ where: { id, deletedAt: null }, include: { responses: true } });
  if (!row) throw new HttpError(404, 'Checklist não encontrado.');
  const c = serializeChecklist(row) as PrintableChecklist;
  const html = buildHtml([c]);
  try {
    const buffer = await htmlToPdf(html);
    return { buffer, filename: `checklist-${c.chassis}-${c.checklistDate}.pdf`, contentType: 'application/pdf' };
  } catch (e) {
    console.warn('Chromium não disponível no servidor, retornando documento HTML pronto para impressão:', (e as Error).message);
    const printableHtml = addPrintToolbar(html, `Checklist ${c.chassis}`);
    return {
      buffer: Buffer.from(printableHtml, 'utf-8'),
      filename: `checklist-${c.chassis}-${c.checklistDate}.html`,
      contentType: 'text/html; charset=utf-8',
    };
  }
}

export async function dailyPdf(q: { date: string; shift?: 'FIRST' | 'SECOND'; blankSeparator?: boolean; includeInProgress?: boolean; ids?: string[] }) {
  const rows = await dailyChecklists(q);
  if (!rows.length) throw new HttpError(404, 'Nenhum checklist encontrado para os filtros informados.');
  const list = rows.map((r) => serializeChecklist(r) as PrintableChecklist);
  const html = buildHtml(list, !!q.blankSeparator);
  const baseFilename = `checklists-${q.date}${q.shift ? '-' + (q.shift === 'FIRST' ? '1turno' : '2turno') : ''}${q.blankSeparator ? '-duplex' : ''}`;
  const pages = planPages(list.length, !!q.blankSeparator);
  try {
    const buffer = await htmlToPdf(html);
    return {
      buffer,
      filename: `${baseFilename}.pdf`,
      contentType: 'application/pdf',
      pages,
    };
  } catch (e) {
    console.warn('Chromium não disponível no servidor, retornando documento HTML pronto para impressão:', (e as Error).message);
    const printableHtml = addPrintToolbar(html, `Relatório ${q.date}`);
    return {
      buffer: Buffer.from(printableHtml, 'utf-8'),
      filename: `${baseFilename}.html`,
      contentType: 'text/html; charset=utf-8',
      pages,
    };
  }
}

export function pdfResponse(buffer: Buffer, filename: string, download: boolean, extra: Record<string, string> = {}) {
  const contentType = extra['Content-Type'] || (filename.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/pdf');
  const isHtml = contentType.includes('html');
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${download && !isHtml ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      ...extra,
    },
  });
}
