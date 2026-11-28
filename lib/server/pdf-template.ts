import { DOC_TITLE, SECTIONS, SectionKey } from '@/lib/shared/catalog';

export interface PrintableChecklist {
  chassis: string; vehicleVersion?: string | null; checklistDate: string; checklistTime: string; shift?: 'FIRST' | 'SECOND' | null;
  inspectorQA?: string | null; leaderVPC?: string | null; bpc?: string | null;
  isPCD?: boolean | null; isL1?: boolean | null; isL2?: boolean | null; isL3?: boolean | null;
  firmwareVersion?: string | null; canbusVersion?: string | null;
  auditResult?: 'APPROVED' | 'REPROVED' | null; nonConformityDescription?: string | null;
  repairStatus?: 'OK' | 'NOK' | 'NOT_APPLICABLE' | null; repairObservation?: string | null;
  repairInspectorQA?: string | null; repairLeaderVPC?: string | null; repairDate?: string | null; repairTime?: string | null;
  responses: { itemCode: string; response: string; observation?: string | null }[];
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const multiline = (s: unknown) => esc(s).replace(/\r?\n/g, '<br>');
const brDate = (d?: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
const monthYear = (d: string) => (/^\d{4}-\d{2}/.test(d) ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
/** Caixa de marcação: o "X" aparece mesmo em impressão preto e branco. */
const box = (checked: boolean) => `<span class="box">${checked ? 'X' : '&nbsp;'}</span>`;

export const CSS = `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Arial, "Liberation Sans", Helvetica, sans-serif; font-size: 9.5pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; width: 210mm; height: 296mm; padding: 10mm 14mm 20mm 14mm; overflow: hidden; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
.page.blank { padding: 0; }
.head { text-align: center; }
.head img { height: 15mm; width: auto; display: inline-block; }
.logo-ph { display: inline-block; border: 0.3mm dashed #888; padding: 3mm 10mm; font-weight: bold; letter-spacing: 1mm; }
.head hr { border: 0; border-top: 0.4mm solid #666; margin: 3mm 0 3mm; }
.doc-title { text-align: center; font-weight: bold; font-size: 13pt; margin: 0 0 4mm; }
.sec { font-weight: bold; font-size: 11pt; text-align: center; margin: 5mm 0 1.5mm; text-transform: uppercase; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 0.25mm solid #888; padding: 1.4mm 1.8mm; vertical-align: middle; overflow-wrap: anywhere; word-break: break-word; }
th { background: #e4e4e4; font-weight: bold; font-size: 9pt; text-align: center; }
td.c { text-align: center; }
td.obs { min-height: 8mm; font-size: 8.5pt; }
tr.item td { height: 9mm; }
.box { display: inline-block; width: 4.2mm; height: 4.2mm; border: 0.3mm solid #000; text-align: center; line-height: 3.6mm; font-size: 9pt; font-weight: bold; vertical-align: middle; }
.lbl { font-weight: bold; background: #f1f1f1; width: 18%; }
.opt { margin-right: 6mm; white-space: nowrap; }
.ul { display: inline-block; min-width: 28mm; border-bottom: 0.25mm solid #000; padding: 0 1mm; }
.bigbox { border: 0.25mm solid #888; padding: 2mm; min-height: 48mm; font-size: 9pt; overflow-wrap: anywhere; word-break: break-word; }
.obsbox { border: 0.25mm solid #888; padding: 2mm; min-height: 24mm; font-size: 9pt; overflow-wrap: anywhere; word-break: break-word; }
.result { border: 0.25mm solid #888; padding: 2.5mm; margin-top: 3mm; font-weight: bold; font-size: 11pt; text-align: center; }
.foot { position: absolute; left: 14mm; right: 14mm; bottom: 8mm; border-top: 0.25mm solid #666; padding-top: 1.5mm; display: flex; justify-content: space-between; font-size: 8pt; }
`;

function header(logo: string | null, withTitle: boolean) {
  const img = logo ? `<img src="${logo}" alt="Nissan">` : `<span class="logo-ph">LOGO NISSAN</span>`;
  return `<div class="head">${img}<hr></div>${withTitle ? `<div class="doc-title">${DOC_TITLE}</div>` : ''}`;
}
const footer = (c: PrintableChecklist) =>
  `<div class="foot"><span>${DOC_TITLE}</span><span>${monthYear(c.checklistDate)}</span></div>`;

function itemsTable(c: PrintableChecklist, key: SectionKey) {
  const sec = SECTIONS.find((s) => s.key === key)!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const widths = sec.allowNA ? [40, 6, 6, 6, 42] : [46, 7, 7, 40];
  const cols = widths.map((w) => `<col style="width:${w}%">`).join('');
  const head = `<tr><th>Item de Verificação</th><th>OK</th><th>NOK</th>${sec.allowNA ? '<th>NA</th>' : ''}<th>Observação</th></tr>`;
  const rows = sec.items.map((i) => {
    const r = map.get(i.code);
    const v = r?.response;
    const value = i.valueField ? (c[i.valueField] ?? '') : '';
    const label = i.valueField ? `${esc(i.label)}: <span class="ul">${esc(value)}</span>` : esc(i.label);
    return `<tr class="item"><td>${label}</td><td class="c">${box(v === 'OK')}</td><td class="c">${box(v === 'NOK')}</td>${
      sec.allowNA ? `<td class="c">${box(v === 'NA')}</td>` : ''
    }<td class="obs">${multiline(r?.observation)}</td></tr>`;
  });
  return `<div class="sec">${esc(sec.title)}</div><table><colgroup>${cols}</colgroup>${head}${rows.join('')}</table>`;
}

function page1(c: PrintableChecklist, logo: string | null) {
  const info = `
  <div class="sec">Informação do Veículo</div>
  <table><colgroup><col style="width:16%"><col style="width:34%"><col style="width:16%"><col style="width:34%"></colgroup>
    <tr><td class="lbl">Versão</td><td>${esc(c.vehicleVersion)}</td><td class="lbl">Chassi</td><td>${esc(c.chassis)}</td></tr>
    <tr><td class="lbl">Data</td><td>${brDate(c.checklistDate)}</td><td class="lbl">Hora</td><td>${esc(c.checklistTime)}</td></tr>
    <tr><td class="lbl">Turno</td><td colspan="3"><span class="opt">${box(c.shift === 'FIRST')} 1º Turno</span><span class="opt">${box(c.shift === 'SECOND')} 2º Turno</span></td></tr>
    <tr><td class="lbl">Inspetor QA</td><td>${esc(c.inspectorQA)}</td><td class="lbl">Líder VPC</td><td>${esc(c.leaderVPC)}</td></tr>
  </table>`;
  return `<section class="page">${header(logo, true)}${info}${itemsTable(c, 'VISUAL')}${footer(c)}</section>`;
}

function page2(c: PrintableChecklist, logo: string | null) {
  return `<section class="page">${header(logo, true)}${itemsTable(c, 'FUNCTIONAL')}${itemsTable(c, 'SOFTWARE')}${itemsTable(c, 'STICKER')}${footer(c)}</section>`;
}

function page3(c: PrintableChecklist, logo: string | null) {
  const naNote = c.repairStatus === 'NOT_APPLICABLE' ? '(Validação de reparo não se aplica) ' : '';
  return `<section class="page">${header(logo, true)}
  ${itemsTable(c, 'AUDIT')}
  <div class="result"><span class="opt">${box(c.auditResult === 'APPROVED')} APROVADO</span><span class="opt">${box(c.auditResult === 'REPROVED')} REPROVADO</span></div>
  <div class="sec" style="text-align:left;font-size:10pt">Descrição da não conformidade:</div>
  <div class="bigbox">${multiline(c.nonConformityDescription)}</div>
  <div class="sec">Validação de Reparo</div>
  <table><colgroup><col style="width:50%"><col style="width:50%"></colgroup>
    <tr><td style="font-weight:bold">ITEM NG FOI REPARADO?</td><td><span class="opt">${box(c.repairStatus === 'OK')} OK</span><span class="opt">${box(c.repairStatus === 'NOK')} NOK</span></td></tr>
  </table>
  <div class="obsbox"><b>Obs.:</b> ${naNote}${multiline(c.repairObservation)}</div>
  <table style="margin-top:2mm"><colgroup><col style="width:14%"><col style="width:36%"><col style="width:14%"><col style="width:36%"></colgroup>
    <tr><td class="lbl" style="width:auto">Inspetor QA</td><td>${esc(c.repairInspectorQA)}</td><td class="lbl" style="width:auto">Líder VPC</td><td>${esc(c.repairLeaderVPC)}</td></tr>
    <tr><td class="lbl" style="width:auto">Data</td><td>${brDate(c.repairDate)}</td><td class="lbl" style="width:auto">Hora</td><td>${esc(c.repairTime)}</td></tr>
  </table>
  ${footer(c)}</section>`;
}

/** As 3 páginas de conteúdo de UM checklist. */
export function renderChecklistPages(c: PrintableChecklist, logo: string | null): string[] {
  return [page1(c, logo), page2(c, logo), page3(c, logo)];
}

export const BLANK_PAGE = '<section class="page blank"></section>';

/**
 * Documento completo. Ordem: [p1 p2 p3] (+ página em branco opcional, exceto após o último veículo).
 * A página em branco não carrega nenhum dado de checklist.
 */
export function renderDocumentHtml(list: PrintableChecklist[], opts: { blankSeparator?: boolean; logo?: string | null } = {}) {
  const logo = opts.logo ?? null;
  const pages: string[] = [];
  list.forEach((c, idx) => {
    pages.push(...renderChecklistPages(c, logo));
    if (opts.blankSeparator && idx < list.length - 1) pages.push(BLANK_PAGE);
  });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${DOC_TITLE}</title><style>${CSS}</style></head><body>${pages.join('')}</body></html>`;
}
