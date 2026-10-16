import { ChecklistLike, ResponsesMap } from '@/lib/shared/rules';

export const toDateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const fromDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/** Converte o registro Prisma (datas como Date) para o formato da API (datas AAAA-MM-DD). */
export function serializeChecklist(c: any) {
  const { responses, ...rest } = c;
  return {
    ...rest,
    checklistDate: fromDate(c.checklistDate),
    repairDate: fromDate(c.repairDate),
    responses: (responses ?? []).map((r: any) => ({
      itemCode: r.itemCode,
      section: r.section,
      itemLabelSnapshot: r.itemLabelSnapshot,
      response: r.response,
      observation: r.observation,
    })),
  };
}

export function toRuleInput(serialized: any): { checklist: ChecklistLike; responses: ResponsesMap } {
  const responses: ResponsesMap = {};
  for (const r of serialized.responses) responses[r.itemCode] = { response: r.response, observation: r.observation };
  return { checklist: serialized, responses };
}

/** "" -> null para campos de texto */
export const emptyToNull = <T>(v: T): T | null => (typeof v === 'string' && v.trim() === '' ? null : v);

/** Data/hora atual no fuso da planta (APP_TIMEZONE) */
export function nowInTz(tz = process.env.APP_TIMEZONE || 'America/Sao_Paulo') {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
