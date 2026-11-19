// Teste de renderização real (Chromium): valida nº de páginas A4 e ausência de conteúdo cortado.
// É ignorado automaticamente se o Chromium não estiver instalado (npm run browsers:install).
import { PDFDocument } from 'pdf-lib';
import { ALL_ITEMS } from '../shared/catalog';
import { PdfService } from './pdf.service';
import { PrintableChecklist } from './checklist-template';

const long = 'Observação muito longa com palavras_sem_espaco_'.repeat(12);
const mk = (chassis: string): PrintableChecklist => ({
  chassis, vehicleVersion: 'XE', checklistDate: '2026-10-14', checklistTime: '08:00', shift: 'FIRST', inspectorQA: 'Ana', leaderVPC: 'Bruno', bpc: '1',
  firmwareVersion: '1.0', canbusVersion: 'C1', auditResult: 'REPROVED', nonConformityDescription: long, repairStatus: 'NOK', repairObservation: long,
  responses: ALL_ITEMS.map((i) => ({ itemCode: i.code, response: 'NOK', observation: long.slice(0, 120) })),
});

let svc: PdfService;
let available = true;

beforeAll(async () => {
  svc = new PdfService(null as any, null as any);
  try { await (svc as any).getBrowser(); } catch { available = false; }
});
afterAll(async () => { await svc.onModuleDestroy(); });

const maybe = (name: string, fn: () => Promise<void>) => it(name, async () => { if (!available) return console.warn('Chromium indisponível: teste ignorado'); await fn(); });

describe('PDF (Chromium)', () => {
  maybe('PDF individual: 3 páginas A4', async () => {
    const pdf = await PDFDocument.load(await svc.htmlToPdf(svc.html([mk('V1')])));
    expect(pdf.getPageCount()).toBe(3);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595); // A4 em pontos
    expect(Math.round(height)).toBe(842);
  });
  maybe('PDF em lote: 3 páginas por veículo e separadores em branco', async () => {
    const list = [mk('V1'), mk('V2'), mk('V3'), mk('V4')];
    expect((await PDFDocument.load(await svc.htmlToPdf(svc.html(list)))).getPageCount()).toBe(12);
    expect((await PDFDocument.load(await svc.htmlToPdf(svc.html(list, true)))).getPageCount()).toBe(15);
  });
  maybe('nenhuma página tem conteúdo cortado (mesmo com textos longos)', async () => {
    const browser = await (svc as any).getBrowser();
    const page = await browser.newPage();
    await page.setContent(svc.html([mk('V1')]));
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('.page')].map((p) => ({ v: p.scrollHeight - p.clientHeight, h: p.scrollWidth - p.clientWidth })),
    );
    await page.close();
    overflow.forEach((o: { v: number; h: number }) => { expect(o.v).toBeLessThanOrEqual(1); expect(o.h).toBeLessThanOrEqual(1); });
  });
});
