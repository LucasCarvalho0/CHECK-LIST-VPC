import { DOC_TITLE, SECTIONS } from '@/lib/shared/catalog';

export interface PrintableChecklist {
  chassis: string; vehicleVersion?: string | null; checklistDate: string; checklistTime: string; shift?: 'FIRST' | 'SECOND' | null;
  inspectorQA?: string | null; leaderVPC?: string | null; bpc?: string | null;
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
const monthYear = (d?: string | null) => (d && /^\d{4}-\d{2}/.test(d) ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : '10/2026');

/** □ vazio ou X marcado */
const box = (checked: boolean) => `<span class="chk">${checked ? 'X' : '&nbsp;'}</span>`;

export const CSS = `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #000;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── PÁGINA ── */
.pg {
  position: relative;
  width: 210mm;
  min-height: 297mm;
  height: 297mm;
  padding: 10mm 15mm 20mm 15mm;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.pg:last-child { page-break-after: auto; break-after: auto; }

/* ── CABEÇALHO ── */
.hd { text-align: center; margin-bottom: 2mm; }
.hd img { height: 12mm; width: auto; display: inline-block; }
.logo-ph { display: inline-block; border: 0.3mm dashed #888; padding: 2mm 8mm; font-weight: bold; font-size: 10pt; }
.hd-line { border: none; border-top: 0.6mm solid #000; margin: 2mm 0 3mm; }

/* ── TÍTULO ── */
.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 10.5pt;
  margin: 0 0 4mm;
  text-transform: uppercase;
  letter-spacing: 0.05mm;
}

/* ── TÍTULOS DE SEÇÃO ── */
.sec-title {
  font-weight: bold;
  font-size: 9.5pt;
  text-align: center;
  margin: 4mm 0 1.5mm;
  text-transform: uppercase;
}

/* ── TABELAS ── */
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
th, td {
  border: 0.3mm solid #555;
  padding: 1.5mm 2mm;
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
th {
  background-color: #d8d8d8;
  font-weight: bold;
  font-size: 9pt;
  text-align: center;
}
td { font-size: 8.5pt; }
td.cc { text-align: center; }
td.gr { background-color: #ebebeb; }

/* linhas de itens: altura mínima fixa */
tr.it td { height: 7mm; }

/* ── CHECKBOX QUADRADO ── */
.chk {
  display: inline-block;
  width: 4mm;
  height: 4mm;
  border: 0.35mm solid #000;
  text-align: center;
  line-height: 3.7mm;
  font-size: 8pt;
  font-weight: bold;
  vertical-align: middle;
  background: #fff;
}

/* ── TURNO / INLINE OPTIONS ── */
.iopt { display: inline-block; margin-right: 6mm; white-space: nowrap; }

/* ── RESULTADO AUDITORIA ── */
.audit-row {
  text-align: center;
  font-size: 9.5pt;
  font-weight: bold;
  margin: 4mm 0;
}
.audit-row .iopt { margin: 0 10mm; font-size: 9.5pt; }

/* ── NÃO CONFORMIDADE ── */
.nc-label { font-size: 8.5pt; margin: 3mm 0 1.5mm; }
.nc-line  { border-bottom: 0.3mm solid #888; height: 6.5mm; margin-bottom: 2mm; }

/* ── SEPARADOR ── */
.sep { border: none; border-top: 0.5mm solid #aaa; margin: 3.5mm 0; }

/* ── RODAPÉ ── */
.ft {
  position: absolute;
  left: 15mm; right: 15mm; bottom: 6mm;
  text-align: center;
  font-size: 8pt;
  line-height: 1.5;
}
.ft-red { color: #C3002F; }
`;

/* ─────────────────── helpers ─────────────────── */

function hdr(logo: string | null, withTitle: boolean) {
  const img = logo
    ? `<img src="${logo}" alt="Nissan">`
    : `<span class="logo-ph">NISSAN</span>`;
  return (
    `<div class="hd">${img}</div>` +
    `<hr class="hd-line">` +
    (withTitle ? `<div class="doc-title">CHECK LIST – INSTALAÇÃO MULTIMIDIA</div>` : '')
  );
}

function ftr(c: PrintableChecklist) {
  return `<div class="ft">CHECK LIST – INSTALAÇÃO MULTIMÍDIA<br><span class="ft-red">${monthYear(c.checklistDate)}</span></div>`;
}

/* ─────────────────── TABELA: INFO DO VEÍCULO ─────────────────── */
// Colunas: label(19%) | valor(31%) | label(19%) | valor(31%)
function tblInfo(c: PrintableChecklist) {
  return `
<table>
  <colgroup>
    <col style="width:19%"><col style="width:31%">
    <col style="width:19%"><col style="width:31%">
  </colgroup>
  <tr>
    <th colspan="4" style="text-align:left; font-size:9pt; padding:1.8mm 2mm;">Informação do Veículo</th>
  </tr>
  <tr>
    <td class="gr">Versão</td>
    <td colspan="3">${esc(c.vehicleVersion)}</td>
  </tr>
  <tr>
    <td class="gr">Chassi</td>
    <td colspan="3">${esc(c.chassis)}</td>
  </tr>
  <tr>
    <td class="gr">Data</td>
    <td>${brDate(c.checklistDate)}</td>
    <td class="gr">Hora</td>
    <td>${esc(c.checklistTime)}</td>
  </tr>
  <tr>
    <td class="gr">Turno</td>
    <td colspan="3">
      <span class="iopt">${box(c.shift === 'FIRST')} 1º Turno</span>
      <span class="iopt">${box(c.shift === 'SECOND')} 2º Turno</span>
    </td>
  </tr>
  <tr>
    <td class="gr">Inspetor QA</td>
    <td>${esc(c.inspectorQA)}</td>
    <td class="gr">Lider VPC</td>
    <td>${esc(c.leaderVPC)}</td>
  </tr>
</table>`;
}

/* ─────────────────── TABELA: INSPEÇÃO VISUAL ─────────────────── */
// Colunas: item(58%) | OK(7%) | NOK(7%) | Obs(28%)
function tblVisual(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'VISUAL')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    return `<tr class="it">
      <td>${esc(i.label.replace(/\.$/, ''))}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td>${multiline(r?.observation)}</td>
    </tr>`;
  }).join('');
  return `
<div class="sec-title">INSPEÇÃO VISUAL</div>
<table>
  <colgroup><col style="width:58%"><col style="width:7%"><col style="width:7%"><col style="width:28%"></colgroup>
  <tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>Observação</th></tr>
  ${rows}
</table>`;
}

/* ─────────────────── TABELA: INSPEÇÃO FUNCIONAL ─────────────────── */
const FUNC_CG = `<colgroup><col style="width:58%"><col style="width:7%"><col style="width:7%"><col style="width:28%"></colgroup>`;
const FUNC_TH = `<tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>Observação</th></tr>`;

function funcRows(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'FUNCTIONAL')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  return sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    return `<tr class="it">
      <td>${esc(i.label.replace(/\.$/, ''))}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td>${multiline(r?.observation)}</td>
    </tr>`;
  }).join('');
}

/* ─────────────────── TABELA: INSPEÇÃO DE SOFTWARE ─────────────────── */
// Colunas: item(36%) | OK(7%) | NOK(7%) | Obs(50%)
function tblSoftware(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'SOFTWARE')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    const val = i.valueField ? (c[i.valueField as keyof PrintableChecklist] as string | null | undefined) : null;
    const obs = r?.observation || val || '*TRAVAR CAMPO OBRIGATÓRIO';
    return `<tr class="it">
      <td>${esc(i.label)}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td style="font-size:7.5pt;">${esc(obs)}</td>
    </tr>`;
  }).join('');
  return `
<div class="sec-title">INSPEÇÃO DE SOFTWARE</div>
<table>
  <colgroup><col style="width:36%"><col style="width:7%"><col style="width:7%"><col style="width:50%"></colgroup>
  <tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>Observação</th></tr>
  ${rows}
</table>`;
}

/* ─────────────────── TABELA: APLICAÇÃO DE ADESIVO ─────────────────── */
// Colunas: item(50%) | OK(6%) | NOK(6%) | NA(6%) | Obs(32%)
function tblSticker(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'STICKER')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    return `<tr class="it">
      <td>${esc(i.label.replace(/\.$/, ''))}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td class="cc">${box(v === 'NA')}</td>
      <td>${multiline(r?.observation)}</td>
    </tr>`;
  }).join('');
  return `
<div class="sec-title">CHECKLIST - APLICAÇÃO DE ADESIVO</div>
<table>
  <colgroup><col style="width:50%"><col style="width:6%"><col style="width:6%"><col style="width:6%"><col style="width:32%"></colgroup>
  <tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>NA</th><th>Observação</th></tr>
  ${rows}
</table>`;
}

/* ─────────────────── TABELA: RESULTADO DA AUDITORIA ─────────────────── */
// Colunas: item(58%) | OK(7%) | NOK(7%) | Obs(28%)
function tblAudit(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'AUDIT')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    return `<tr class="it">
      <td>${esc(i.label)}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td>${multiline(r?.observation)}</td>
    </tr>`;
  }).join('');
  return `
<div class="sec-title">RESULTADO DA AUDITORIA</div>
<table>
  <colgroup><col style="width:58%"><col style="width:7%"><col style="width:7%"><col style="width:28%"></colgroup>
  <tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>Observação</th></tr>
  ${rows}
</table>`;
}

/* ─────────────────── TABELA: VALIDAÇÃO DE REPARO ─────────────────── */
// Colunas: label(35%) | valor(15%) | label(15%) | valor(35%) — como o formulário
function tblRepair(c: PrintableChecklist) {
  return `
<table>
  <colgroup>
    <col style="width:35%"><col style="width:15%">
    <col style="width:15%"><col style="width:35%">
  </colgroup>
  <tr>
    <th colspan="4" style="text-align:center; font-size:9.5pt; padding:2mm;">VALIDAÇÃO DE REPARO</th>
  </tr>
  <tr>
    <td colspan="4" style="padding:2mm 2mm; font-size:8.5pt;">
      ITEM NG FOI REPARADO?&nbsp;&nbsp;&nbsp;&nbsp;
      <span class="iopt">${box(c.repairStatus === 'OK')} OK</span>
      &nbsp;|&nbsp;
      <span class="iopt">${box(c.repairStatus === 'NOK')} NOK</span>
    </td>
  </tr>
  <tr>
    <td colspan="4" style="height:14mm; vertical-align:top; padding:1.5mm 2mm; font-size:8.5pt;">
      Obs.<br>${multiline(c.repairObservation) || '&nbsp;'}
    </td>
  </tr>
  <tr>
    <td class="gr">Inspetor QA</td>
    <td colspan="3">${esc(c.repairInspectorQA)}</td>
  </tr>
  <tr>
    <td class="gr">Líder VPC</td>
    <td colspan="3">${esc(c.repairLeaderVPC)}</td>
  </tr>
  <tr>
    <td class="gr">Data</td>
    <td>${brDate(c.repairDate)}</td>
    <td class="gr">Hora</td>
    <td>${esc(c.repairTime)}</td>
  </tr>
</table>`;
}

/* ═══════════════════ PÁGINAS ═══════════════════ */

/**
 * PÁGINA 1
 * - Logo + linha + título
 * - Tabela Informação do Veículo
 * - Tabela Inspeção Visual
 * - Cabeçalho da tabela Inspeção Funcional (apenas header, sem linhas)
 * - Rodapé
 */
function page1(c: PrintableChecklist, logo: string | null) {
  const funcHeader = `
<div class="sec-title">INSPEÇÃO FUNCIONAL</div>
<table>
  ${FUNC_CG}
  ${FUNC_TH}
</table>`;

  return `<section class="pg">
  ${hdr(logo, true)}
  ${tblInfo(c)}
  ${tblVisual(c)}
  ${funcHeader}
  ${ftr(c)}
</section>`;
}

/**
 * PÁGINA 2
 * - Logo + linha (sem título)
 * - Linhas da Inspeção Funcional (sem título repetido)
 * - Tabela Inspeção de Software
 * - Tabela Aplicação de Adesivo
 * - Rodapé
 */
function page2(c: PrintableChecklist, logo: string | null) {
  const funcTable = `<table>${FUNC_CG}${funcRows(c)}</table>`;

  return `<section class="pg">
  ${hdr(logo, false)}
  ${funcTable}
  ${tblSoftware(c)}
  ${tblSticker(c)}
  ${ftr(c)}
</section>`;
}

/**
 * PÁGINA 3
 * - Logo + linha (sem título)
 * - Tabela Resultado da Auditoria
 * - □ APROVADO  |  □ REPROVADO
 * - "Descrição da não conformidade:"
 * - Linha de escrita
 * - Separadores
 * - Tabela Validação de Reparo
 * - Rodapé
 */
function page3(c: PrintableChecklist, logo: string | null) {
  const ncLine = `<div class="nc-line">${esc(c.nonConformityDescription) || '&nbsp;'}</div>`;

  return `<section class="pg">
  ${hdr(logo, false)}
  ${tblAudit(c)}
  <div class="audit-row">
    <span class="iopt">${box(c.auditResult === 'APPROVED')} APROVADO</span>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    <span class="iopt">${box(c.auditResult === 'REPROVED')} REPROVADO</span>
  </div>
  <div class="nc-label">Descrição da não conformidade:</div>
  ${ncLine}
  <hr class="sep">
  <hr class="sep" style="margin-top:0">
  ${tblRepair(c)}
  ${ftr(c)}
</section>`;
}

/* ═══════════════════ EXPORTS ═══════════════════ */

/** As 3 páginas de conteúdo de UM checklist. */
export function renderChecklistPages(c: PrintableChecklist, logo: string | null): string[] {
  return [page1(c, logo), page2(c, logo), page3(c, logo)];
}

export const BLANK_PAGE = '<section class="pg" style="padding:0"></section>';

/**
 * Documento completo: [p1 p2 p3] por checklist,
 * com página em branco opcional entre veículos.
 */
export function renderDocumentHtml(
  list: PrintableChecklist[],
  opts: { blankSeparator?: boolean; logo?: string | null } = {},
) {
  const logo = opts.logo ?? null;
  const pages: string[] = [];
  list.forEach((c, idx) => {
    pages.push(...renderChecklistPages(c, logo));
    if (opts.blankSeparator && idx < list.length - 1) pages.push(BLANK_PAGE);
  });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${DOC_TITLE}</title><style>${CSS}</style></head><body>${pages.join('')}</body></html>`;
}
