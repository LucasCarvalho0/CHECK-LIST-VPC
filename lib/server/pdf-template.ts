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
const box = (checked: boolean) => `<span class="box">${checked ? 'X' : '&nbsp;'}</span>`;

export const CSS = `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8.5pt;
  color: #000;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── PÁGINA ── */
.page {
  position: relative;
  width: 210mm;
  min-height: 297mm;
  height: 297mm;
  padding: 10mm 15mm 20mm 15mm;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.page:last-child { page-break-after: auto; break-after: auto; }

/* ── CABEÇALHO ── */
.hd { text-align: center; margin-bottom: 2mm; }
.hd img { height: 11mm; width: auto; display: inline-block; }
.logo-ph { display: inline-block; border: 0.3mm dashed #888; padding: 2mm 8mm; font-weight: bold; font-size: 10pt; }
.hd-line { border: none; border-top: 1.2px solid #000; margin: 2.5mm 0 3.5mm; }

/* ── TÍTULO DO DOCUMENTO ── */
.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 10.5pt;
  margin: 0 0 3.5mm;
  text-transform: uppercase;
  letter-spacing: 0.1mm;
}

/* ── TÍTULOS DE SEÇÃO ── */
.sec-title {
  font-weight: bold;
  font-size: 9.5pt;
  text-align: center;
  margin: 4.5mm 0 2mm;
  text-transform: uppercase;
  letter-spacing: 0.05mm;
}

/* ── TABELAS ── */
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
th, td {
  border: 0.3mm solid #d0d0d0;
  padding: 1.5mm 2.2mm;
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
th {
  background-color: #f5f5f5;
  font-weight: bold;
  font-size: 8.5pt;
  text-align: center;
  white-space: nowrap;
}
td { font-size: 8pt; }
td.cc { text-align: center; }
td.gr { background-color: #f5f5f5; }

/* linhas de itens com altura padrão */
tr.item td { height: 6.8mm; }

/* ── CHECKBOX QUADRADO ── */
.box {
  display: inline-block;
  width: 3.8mm;
  height: 3.8mm;
  border: 0.35mm solid #333;
  text-align: center;
  line-height: 3.5mm;
  font-size: 7.5pt;
  font-weight: bold;
  vertical-align: middle;
  background: #fff;
}

/* ── OPÇÕES INLINE ── */
.iopt { display: inline-block; margin-right: 5mm; white-space: nowrap; font-size: 8.5pt; }

/* ── DIVISÓRIA HORIZONTAL ENTRE SEÇÕES ── */
.sec-divider {
  border: none;
  border-top: 0.8px solid #bbb;
  margin: 4mm 0 2mm;
}

/* ── RESULTADO AUDITORIA ── */
.audit-row {
  text-align: center;
  font-size: 9pt;
  font-weight: bold;
  margin: 4mm 0 3mm;
}
.audit-row .iopt { margin: 0 8mm; font-size: 9pt; }

/* ── NÃO CONFORMIDADE ── */
.nc-section { margin-top: 2mm; margin-bottom: 3.5mm; }
.nc-label { font-size: 8pt; margin-bottom: 2mm; }
.nc-line {
  border-bottom: 0.35mm solid #888;
  height: 6mm;
  line-height: 6mm;
  font-size: 7.5pt;
  margin-bottom: 2.5mm;
  padding-left: 1mm;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.obs-wrap {
  max-height: 5.5mm;
  overflow: hidden;
  word-break: break-word;
  line-height: 1.2;
}

/* ── RODAPÉ ── */
.ft {
  position: absolute;
  left: 15mm; right: 15mm; bottom: 6mm;
  text-align: center;
  font-size: 7.5pt;
  line-height: 1.4;
}
.ft-red { color: #C3002F; font-weight: 500; }
`;

/* ─────────────────── HELPERS ─────────────────── */

function hdr(logo: string | null, withTitle: boolean) {
  const img = logo
    ? `<img src="${logo}" alt="Nissan">`
    : `<span class="logo-ph">NISSAN</span>`;
  return (
    `<div class="hd">${img}</div>` +
    `<hr class="hd-line">` +
    (withTitle ? `<div class="doc-title">CHECK LIST – INSTALAÇÃO MULTIMÍDIA</div>` : '')
  );
}

function ftr(c: PrintableChecklist) {
  return `<div class="ft">CHECK LIST – INSTALAÇÃO MULTIMÍDIA<br><span class="ft-red">${monthYear(c.checklistDate)}</span></div>`;
}

function renderNcLines(desc?: string | null) {
  const text = (desc ?? '').trim();
  if (!text) {
    return `<div class="nc-line">&nbsp;</div><div class="nc-line">&nbsp;</div>`;
  }
  const lines = text.split(/\r?\n/);
  let l1 = lines[0] ?? '';
  let l2 = lines.slice(1).join(' ') ?? '';
  if (lines.length === 1 && l1.length > 80) {
    const cut = l1.lastIndexOf(' ', 80);
    const pos = cut > 45 ? cut : 80;
    l2 = l1.slice(pos).trim();
    l1 = l1.slice(0, pos).trim();
  }
  return `<div class="nc-line">${esc(l1) || '&nbsp;'}</div><div class="nc-line">${esc(l2) || '&nbsp;'}</div>`;
}

/* ─────────────────── TABELA: INFO DO VEÍCULO (PÁGINA 1) ─────────────────── */
// Tabela fiel de 2 colunas: col1(~35%) | col2(~65%)
function tblInfo(c: PrintableChecklist) {
  const dateVal = brDate(c.checklistDate);
  const timeVal = esc(c.checklistTime);

  const inspectorVal = esc(c.inspectorQA);
  const leaderVal = esc(c.leaderVPC);

  // Se preenchido: exibe rótulo com dois pontos "Data: 16/10/2026" e "Hora: 21:40"
  // Se em branco: exibe exatamente "Data            Hora" na coluna 1 e "&nbsp;" na coluna 2 como na imagem
  const dateCell = dateVal
    ? `Data: <strong>${dateVal}</strong>`
    : `Data &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Hora`;
  const timeCell = dateVal
    ? `Hora: <strong>${timeVal || '&nbsp;'}</strong>`
    : '&nbsp;';

  const inspectorCell = inspectorVal ? `Inspetor QA: <strong>${inspectorVal}</strong>` : 'Inspetor QA';
  const leaderCell = leaderVal ? `Lider VPC: <strong>${leaderVal}</strong>` : 'Lider VPC';

  return `
<table>
  <colgroup>
    <col style="width:35%">
    <col style="width:65%">
  </colgroup>
  <tr>
    <th style="text-align:left; font-size:8.5pt; padding:1.8mm 2.5mm; background-color:#f5f5f5;">Informação do Veículo</th>
    <th style="background-color:#f5f5f5;">&nbsp;</th>
  </tr>
  <tr>
    <td>Versão</td>
    <td>${esc(c.vehicleVersion)}</td>
  </tr>
  <tr>
    <td>Chassi</td>
    <td>${esc(c.chassis)}</td>
  </tr>
  <tr>
    <td>${dateCell}</td>
    <td>${timeCell}</td>
  </tr>
  <tr>
    <td>Turno</td>
    <td>
      <span class="iopt">${box(c.shift === 'FIRST')} 1º Turno</span>
      <span class="iopt">${box(c.shift === 'SECOND')} 2º Turno</span>
    </td>
  </tr>
  <tr>
    <td>${inspectorCell}</td>
    <td>${leaderCell}</td>
  </tr>
</table>`;
}

/* ─────────────────── TABELA: INSPEÇÃO VISUAL (PÁGINA 1) ─────────────────── */
const VIS_CG = `<colgroup><col style="width:58%"><col style="width:7%"><col style="width:7%"><col style="width:28%"></colgroup>`;
const VIS_TH = `<tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>Observação</th></tr>`;

function tblVisual(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'VISUAL')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    return `<tr class="item">
      <td>${esc(i.label.replace(/\.$/, ''))}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td><div class="obs-wrap">${multiline(r?.observation)}</div></td>
    </tr>`;
  }).join('');
  return `
<div class="sec-title">INSPEÇÃO VISUAL</div>
<table>
  ${VIS_CG}
  ${VIS_TH}
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
    return `<tr class="item">
      <td>${esc(i.label.replace(/\.$/, ''))}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td><div class="obs-wrap">${multiline(r?.observation)}</div></td>
    </tr>`;
  }).join('');
}

/* ─────────────────── TABELA: INSPEÇÃO DE SOFTWARE (PÁGINA 2) ─────────────────── */
function tblSoftware(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'SOFTWARE')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    const val = i.valueField ? (c[i.valueField as keyof PrintableChecklist] as string | null | undefined) : null;
    const obsText = r?.observation || val;
    const obsHtml = obsText
      ? `<span style="font-size:8pt;">${esc(obsText)}</span>`
      : `<strong>*TRAVAR CAMPO OBRIGATÓRIO</strong>`;

    return `<tr class="item">
      <td>${esc(i.label)}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td style="text-align:center; font-size:7.5pt;">${obsHtml}</td>
    </tr>`;
  }).join('');
  return `
<div class="sec-title">INSPEÇÃO DE SOFTWARE</div>
<table>
  <colgroup><col style="width:38%"><col style="width:7%"><col style="width:7%"><col style="width:48%"></colgroup>
  <tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>Observação</th></tr>
  ${rows}
</table>`;
}

/* ─────────────────── TABELA: APLICAÇÃO DE ADESIVO (PÁGINA 2) ─────────────────── */
// Colunas: item(46%) | OK(6%) | NOK(6%) | NA(6%) | Obs(36%)
// IMPORTANTE: Na imagem original, a linha 4 NÃO possui caixa de seleção na coluna NOK (está em branco)!
function tblSticker(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'STICKER')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    const isRow4 = i.code === 'ADE_04';

    return `<tr class="item">
      <td>${esc(i.label.replace(/\.$/, ''))}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${isRow4 ? '&nbsp;' : box(v === 'NOK')}</td>
      <td class="cc">${box(v === 'NA')}</td>
      <td><div class="obs-wrap">${multiline(r?.observation)}</div></td>
    </tr>`;
  }).join('');
  return `
<div class="sec-title">CHECKLIST - APLICAÇÃO DE ADESIVO</div>
<table>
  <colgroup><col style="width:46%"><col style="width:6%"><col style="width:6%"><col style="width:6%"><col style="width:36%"></colgroup>
  <tr><th>Item de Verificação</th><th>OK</th><th>NOK</th><th>NA</th><th>Observação</th></tr>
  ${rows}
</table>`;
}

/* ─────────────────── TABELA: RESULTADO DA AUDITORIA (PÁGINA 3) ─────────────────── */
function tblAudit(c: PrintableChecklist) {
  const sec = SECTIONS.find((s) => s.key === 'AUDIT')!;
  const map = new Map(c.responses.map((r) => [r.itemCode, r]));
  const rows = sec.items.map((i) => {
    const r = map.get(i.code); const v = r?.response;
    return `<tr class="item">
      <td>${esc(i.label.replace(/\.$/, ''))}</td>
      <td class="cc">${box(v === 'OK')}</td>
      <td class="cc">${box(v === 'NOK')}</td>
      <td><div class="obs-wrap">${multiline(r?.observation)}</div></td>
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

/* ─────────────────── TABELA: VALIDAÇÃO DE REPARO (PÁGINA 3) ─────────────────── */
// Tabela de 2 colunas idêntica à imagem original
function tblRepair(c: PrintableChecklist) {
  const inspVal = esc(c.repairInspectorQA);
  const leaderVal = esc(c.repairLeaderVPC);
  const dateVal = brDate(c.repairDate);
  const timeVal = esc(c.repairTime);

  return `
<table style="margin-top: 6mm;">
  <colgroup>
    <col style="width:40%">
    <col style="width:60%">
  </colgroup>
  <tr>
    <th colspan="2" style="text-align:center; font-size:9pt; padding:2mm; background-color:#f5f5f5;">
      VALIDAÇÃO DE REPARO<!-- Validação de Reparo -->
    </th>
  </tr>
  <tr>
    <td colspan="2" style="padding:2mm 2.5mm; font-size:8pt;">
      ITEM NG FOI REPARADO?&nbsp;&nbsp;&nbsp;&nbsp;
      <span class="iopt">${box(c.repairStatus === 'OK')} OK</span>
      &nbsp;|&nbsp;
      <span class="iopt">${box(c.repairStatus === 'NOK')} NOK</span>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="height:12mm; vertical-align:top; padding:1.5mm 2.5mm; font-size:8pt;">
      Obs.<br><div style="max-height:8mm; overflow:hidden; word-break:break-word;">${multiline(c.repairObservation) || '&nbsp;'}</div>
    </td>
  </tr>
  <tr>
    <td>Inspetor QA</td>
    <td>${inspVal ? `<strong>${inspVal}</strong>` : '&nbsp;'}</td>
  </tr>
  <tr>
    <td>Líder VPC</td>
    <td>${leaderVal ? `<strong>${leaderVal}</strong>` : '&nbsp;'}</td>
  </tr>
  <tr>
    <td>Data${dateVal ? `: <strong>${dateVal}</strong>` : ''}</td>
    <td>Hora${timeVal ? `: <strong>${timeVal}</strong>` : ''}</td>
  </tr>
</table>`;
}

/* ═══════════════════ PÁGINAS ═══════════════════ */

/**
 * PÁGINA 1
 * - Logo + linha + título CHECK LIST – INSTALAÇÃO MULTIMIDIA
 * - Tabela Informação do Veículo (2 colunas)
 * - Tabela Inspeção Visual (12 itens)
 * - Linha divisória horizontal
 * - Título INSPEÇÃO FUNCIONAL + Cabeçalho da tabela (sem linhas)
 * - Rodapé
 */
function page1(c: PrintableChecklist, logo: string | null) {
  const funcHeader = `
<hr class="sec-divider">
<div class="sec-title">INSPEÇÃO FUNCIONAL</div>
<table>
  ${FUNC_CG}
  ${FUNC_TH}
</table>`;

  return `<section class="page">
  ${hdr(logo, true)}
  ${tblInfo(c)}
  ${tblVisual(c)}
  ${funcHeader}
  ${ftr(c)}
</section>`;
}

/**
 * PÁGINA 2
 * - Logo + linha (sem título do documento)
 * - Linhas da Inspeção Funcional (continuação direta, sem repetir título nem cabeçalho)
 * - Tabela Inspeção de Software (com *TRAVAR CAMPO OBRIGATÓRIO)
 * - Tabela Aplicação de Adesivo (com 4ª linha sem checkbox em NOK)
 * - Rodapé
 */
function page2(c: PrintableChecklist, logo: string | null) {
  const funcTable = `<!-- INSPEÇÃO FUNCIONAL --><table>${FUNC_CG}${funcRows(c)}</table>`;

  return `<section class="page">
  ${hdr(logo, false)}
  ${funcTable}
  ${tblSoftware(c)}
  ${tblSticker(c)}
  ${ftr(c)}
</section>`;
}

/**
 * PÁGINA 3
 * - Logo + linha (sem título do documento)
 * - Tabela Resultado da Auditoria
 * - □ APROVADO  |  □ REPROVADO
 * - Descrição da não conformidade + 2 linhas de escrita (pautas)
 * - Tabela Validação de Reparo (2 colunas)
 * - Rodapé
 */
function page3(c: PrintableChecklist, logo: string | null) {
  return `<section class="page">
  ${hdr(logo, false)}
  ${tblAudit(c)}
  <div class="audit-row">
    <span class="iopt">${box(c.auditResult === 'APPROVED')} APROVADO</span>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    <span class="iopt">${box(c.auditResult === 'REPROVED')} REPROVADO</span>
  </div>
  <div class="nc-section">
    <div class="nc-label">Descrição da não conformidade:</div>
    ${renderNcLines(c.nonConformityDescription)}
  </div>
  ${tblRepair(c)}
  ${ftr(c)}
</section>`;
}

/* ═══════════════════ EXPORTS ═══════════════════ */

/** As 3 páginas de conteúdo de UM checklist. */
export function renderChecklistPages(c: PrintableChecklist, logo: string | null): string[] {
  return [page1(c, logo), page2(c, logo), page3(c, logo)];
}

export const BLANK_PAGE = '<section class="page blank"></section>';

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
