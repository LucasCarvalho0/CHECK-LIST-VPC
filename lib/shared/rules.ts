import { ALL_ITEMS, ResponseValue, SECTIONS, normalizeChassis } from './catalog';

export interface ChecklistLike {
  vehicleVersion?: string | null;
  chassis?: string | null;
  checklistDate?: string | null; // YYYY-MM-DD
  checklistTime?: string | null; // HH:mm
  shift?: 'FIRST' | 'SECOND' | null;
  inspectorQA?: string | null;
  leaderVPC?: string | null;
  bpc?: string | null;
  firmwareVersion?: string | null;
  canbusVersion?: string | null;
  auditResult?: 'APPROVED' | 'REPROVED' | null;
  nonConformityDescription?: string | null;
  repairStatus?: 'OK' | 'NOK' | 'NOT_APPLICABLE' | null;
  repairObservation?: string | null;
  repairInspectorQA?: string | null;
  repairLeaderVPC?: string | null;
  repairDate?: string | null;
  repairTime?: string | null;
}

export type ResponsesMap = Record<string, { response: ResponseValue; observation?: string | null }>;

export interface RuleError {
  field: string; // campo do checklist ou código do item
  message: string;
}

const blank = (v?: string | null) => !v || !v.trim();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Existe algum item NG (NOK) ou auditoria reprovada? Então a validação de reparo se aplica. */
export function hasNonConformity(c: ChecklistLike, responses: ResponsesMap): boolean {
  return c.auditResult === 'REPROVED' || Object.values(responses).some((r) => r.response === 'NOK');
}

/**
 * Regras de finalização. Usada no frontend e no backend (mesmo arquivo).
 * Rascunhos NÃO passam por esta validação.
 */
export function validateForFinalize(c: ChecklistLike, responses: ResponsesMap): RuleError[] {
  const e: RuleError[] = [];
  const req = (field: string, value: string | null | undefined, msg: string) => {
    if (blank(value)) e.push({ field, message: msg });
  };

  req('vehicleVersion', c.vehicleVersion, 'Informe a versão do veículo.');
  if (blank(normalizeChassis(c.chassis ?? ''))) e.push({ field: 'chassis', message: 'Informe o chassi.' });
  if (!c.checklistDate || !DATE_RE.test(c.checklistDate)) e.push({ field: 'checklistDate', message: 'Informe uma data válida.' });
  if (!c.checklistTime || !TIME_RE.test(c.checklistTime)) e.push({ field: 'checklistTime', message: 'Informe um horário válido (HH:mm).' });
  if (!c.shift) e.push({ field: 'shift', message: 'Selecione o turno.' });
  req('inspectorQA', c.inspectorQA, 'Informe o Inspetor QA.');
  req('leaderVPC', c.leaderVPC, 'Informe o Líder VPC.');

  for (const item of ALL_ITEMS) {
    const r = responses[item.code]?.response ?? 'UNANSWERED';
    if (r === 'UNANSWERED') e.push({ field: item.code, message: `Responda o item: ${item.label}` });
    else if (r === 'NA' && !item.allowNA) e.push({ field: item.code, message: `NA não é permitido no item: ${item.label}` });
  }

  req('firmwareVersion', c.firmwareVersion, 'Informe a Versão Firmware identificada.');
  req('canbusVersion', c.canbusVersion, 'Informe a Versão Canbus identificada.');

  if (!c.auditResult) e.push({ field: 'auditResult', message: 'Selecione o resultado geral da auditoria (APROVADO/REPROVADO).' });
  if (c.auditResult === 'REPROVED') req('nonConformityDescription', c.nonConformityDescription, 'Descreva a não conformidade (obrigatório quando REPROVADO).');

  if (hasNonConformity(c, responses)) {
    if (!c.repairStatus) {
      e.push({ field: 'repairStatus', message: 'Há item NG: responda "ITEM NG FOI REPARADO?" ou marque explicitamente que não se aplica.' });
    } else if (c.repairStatus === 'NOT_APPLICABLE') {
      req('repairObservation', c.repairObservation, 'Explique na observação por que a validação de reparo não se aplica.');
    }
  }
  if (c.repairStatus === 'OK' || c.repairStatus === 'NOK') {
    req('repairObservation', c.repairObservation, 'Preencha a observação da validação de reparo.');
    req('repairInspectorQA', c.repairInspectorQA, 'Informe o Inspetor QA da validação de reparo.');
    req('repairLeaderVPC', c.repairLeaderVPC, 'Informe o Líder VPC da validação de reparo.');
    if (!c.repairDate || !DATE_RE.test(c.repairDate)) e.push({ field: 'repairDate', message: 'Informe a data da validação de reparo.' });
    if (!c.repairTime || !TIME_RE.test(c.repairTime)) e.push({ field: 'repairTime', message: 'Informe a hora da validação de reparo.' });
  }
  return e;
}

/** Pendência de reparo: há NG e o reparo ainda não foi validado como OK nem marcado como não aplicável. */
export function isRepairPending(c: ChecklistLike, responses: ResponsesMap): boolean {
  return hasNonConformity(c, responses) && (c.repairStatus == null || c.repairStatus === 'NOK');
}

export const SECTION_TITLES = Object.fromEntries(SECTIONS.map((s) => [s.key, s.title]));
