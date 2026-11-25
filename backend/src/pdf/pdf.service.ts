import { Injectable, Logger, NotFoundException, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import type { Browser } from 'playwright';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { planPages } from '../common/page-plan';
import { serializeChecklist } from '../checklists/checklist.mapper';
import { PrintableChecklist, renderDocumentHtml } from './checklist-template';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly log = new Logger(PdfService.name);
  private browser?: Browser;
  private logoCache?: string | null;

  constructor(private prisma: PrismaService, private reports: ReportsService) {}

  /** Logotipo Nissan fornecido (backend/assets/nissan-logo.png ou LOGO_PATH), embutido como data URI. */
  getLogo(): string | null {
    if (this.logoCache !== undefined) return this.logoCache;
    const candidates = [process.env.LOGO_PATH, ...['png', 'jpg', 'jpeg', 'svg'].map((e) => join(process.cwd(), 'assets', `nissan-logo.${e}`))];
    const file = candidates.find((p) => p && existsSync(p));
    if (!file) {
      this.log.warn('Logotipo Nissan não encontrado (backend/assets/nissan-logo.png). O PDF mostrará um espaço reservado.');
      return (this.logoCache = null);
    }
    const ext = extname(file).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return (this.logoCache = `data:${mime};base64,${readFileSync(file).toString('base64')}`);
  }

  html(list: PrintableChecklist[], blankSeparator = false) {
    return renderDocumentHtml(list, { blankSeparator, logo: this.getLogo() });
  }

  private findChromiumPath(): string | undefined {
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

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    const { chromium } = await import('playwright');
    const execPath = this.findChromiumPath();
    this.browser = await chromium.launch({
      executablePath: execPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    return this.browser;
  }

  async htmlToPdf(html: string): Promise<Buffer | null> {
    try {
      const browser = await this.getBrowser();
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
    } catch (e) {
      this.log.warn(`Chromium não disponível para conversão direta: ${(e as Error).message}`);
      return null;
    }
  }

  async checklistPdf(id: string) {
    const row = await this.prisma.checklist.findFirst({ where: { id, deletedAt: null }, include: { responses: true } });
    if (!row) throw new NotFoundException('Checklist não encontrado.');
    const c = serializeChecklist(row) as PrintableChecklist & { chassis: string };
    const html = this.html([c]);
    const pdfBuffer = await this.htmlToPdf(html);

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

  async dailyPdf(q: { date: string; shift?: 'FIRST' | 'SECOND'; blankSeparator?: boolean; includeInProgress?: boolean; ids?: string[] }) {
    const rows = await this.reports.dailyChecklists(q);
    if (!rows.length) throw new NotFoundException('Nenhum checklist encontrado para os filtros informados.');
    const list = rows.map((r) => serializeChecklist(r) as PrintableChecklist);
    const html = this.html(list, !!q.blankSeparator);
    const pages = planPages(list.length, !!q.blankSeparator);
    const pdfBuffer = await this.htmlToPdf(html);

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

  async onModuleDestroy() {
    await this.browser?.close().catch(() => undefined);
  }
}
