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

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    try {
      const { chromium } = await import('playwright');
      this.browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
      return this.browser;
    } catch (e) {
      this.log.error(`Falha ao iniciar o Chromium: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Geração de PDF indisponível: instale o Chromium (npm run browsers:install) ou defina CHROMIUM_PATH.');
    }
  }

  async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async checklistPdf(id: string) {
    const row = await this.prisma.checklist.findFirst({ where: { id, deletedAt: null }, include: { responses: true } });
    if (!row) throw new NotFoundException('Checklist não encontrado.');
    const c = serializeChecklist(row) as PrintableChecklist & { chassis: string };
    return { buffer: await this.htmlToPdf(this.html([c])), filename: `checklist-${c.chassis}-${c.checklistDate}.pdf` };
  }

  async dailyPdf(q: { date: string; shift?: 'FIRST' | 'SECOND'; blankSeparator?: boolean; includeInProgress?: boolean; ids?: string[] }) {
    const rows = await this.reports.dailyChecklists(q);
    if (!rows.length) throw new NotFoundException('Nenhum checklist encontrado para os filtros informados.');
    const list = rows.map((r) => serializeChecklist(r) as PrintableChecklist);
    const pages = planPages(list.length, !!q.blankSeparator);
    return {
      buffer: await this.htmlToPdf(this.html(list, !!q.blankSeparator)),
      filename: `checklists-${q.date}${q.shift ? '-' + (q.shift === 'FIRST' ? '1turno' : '2turno') : ''}${q.blankSeparator ? '-duplex' : ''}.pdf`,
      pages,
    };
  }

  async onModuleDestroy() {
    await this.browser?.close().catch(() => undefined);
  }
}
