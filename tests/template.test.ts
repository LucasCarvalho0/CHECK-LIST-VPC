import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { planPages } from '@/lib/server/page-plan';
import { ALL_ITEMS } from '@/lib/shared/catalog';
import { PrintableChecklist, renderChecklistPages, renderDocumentHtml } from '@/lib/server/pdf-template';

const mk = (chassis: string, over: Partial<PrintableChecklist> = {}): PrintableChecklist => ({
  chassis, vehicleVersion: 'XE', checklistDate: '2026-10-14', checklistTime: '08:00', shift: 'FIRST',
  inspectorQA: 'Ana', leaderVPC: 'Bruno', bpc: '1', firmwareVersion: '1.0', canbusVersion: 'C1', auditResult: 'APPROVED',
  responses: ALL_ITEMS.map((i) => ({ itemCode: i.code, response: 'OK' })), ...over,
});
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('template do checklist', () => {
  it('gera exatamente 3 páginas A4 por veículo', () => {
    expect(renderChecklistPages(mk('AAA'), null)).toHaveLength(3);
  });
  it('cada veículo tem o seu conjunto de 3 páginas, em ordem, sem misturar chassis', () => {
    const html = renderDocumentHtml([mk('CHASSI-AAA'), mk('CHASSI-BBB')]);
    expect(count(html, /<section class="page">/g)).toBe(6);
    const sections = html.split('<section class="page">').slice(1);
    expect(sections.slice(0, 3).join('')).not.toContain('CHASSI-BBB');
    expect(sections.slice(3).join('')).not.toContain('CHASSI-AAA');
    expect(sections[0]).toContain('Informação do Veículo');
    expect(sections[1]).toContain('INSPEÇÃO FUNCIONAL');
    expect(sections[2]).toContain('Validação de Reparo');
  });
  it('página em branco de separação: após cada veículo, exceto o último, sem dados', () => {
    const html = renderDocumentHtml([mk('V1'), mk('V2'), mk('V3')], { blankSeparator: true });
    expect(count(html, /class="page blank"/g)).toBe(2);
    const blanks = html.match(/<section class="page blank">(.*?)<\/section>/g) ?? [];
    blanks.forEach((b) => expect(b).toBe('<section class="page blank"></section>'));
    expect(count(html, /<section class="page/g)).toBe(planPages(3, true).totalPages);
  });
  it('marca apenas a caixa escolhida e nunca OK e NOK juntos', () => {
    const c = mk('X', { responses: [{ itemCode: 'VIS_01', response: 'NOK', observation: 'Risco <b>forte</b>' }], shift: 'SECOND', auditResult: 'REPROVED' });
    const html = renderChecklistPages(c, null)[0];
    const row = html.split('<tr class="item">')[1];
    expect(count(row.split('</tr>')[0], /class="box">X</g)).toBe(1);
    expect(html).toContain('Risco &lt;b&gt;forte&lt;/b&gt;'); // escapado
    expect(html).toMatch(/class="box">X<\/span> 2º Turno/);
  });
  it('NA aparece somente na tabela de adesivos', () => {
    const [p1, p2] = renderChecklistPages(mk('X'), null);
    expect(p1).not.toContain('<th>NA</th>');
    expect(count(p2, /<th>NA<\/th>/g)).toBe(1);
  });
  it('planPages calcula folhas e páginas', () => {
    expect(planPages(4, false)).toMatchObject({ contentPages: 12, blankPages: 0, totalPages: 12 });
    expect(planPages(4, true)).toMatchObject({ contentPages: 12, blankPages: 3, totalPages: 15 });
    expect(planPages(0, true).totalPages).toBe(0);
  });
});
