import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { planPages } from './page-plan';
import { ITEM_INDEX } from '@/lib/shared/catalog';
import { toDateOnly } from './mapper';
import { buildShiftClause, ShiftFilter } from './shifts';

type Filter = ShiftFilter;

function baseWhere(q: Filter): Prisma.ChecklistWhereInput {
  const where: Prisma.ChecklistWhereInput = { deletedAt: null, status: { not: 'CANCELED' } };
  const shiftClause = buildShiftClause(q);
  return {
    AND: [
      where,
      shiftClause,
    ],
  };
}

/**
 * Indicadores calculados do banco. "Aprovado/Reprovado" contam apenas checklists FINALIZADOS e seguem o
 * resultado escolhido pelo inspetor (finalizar != aprovar). Somente leitura.
 */
export async function summary(q: Filter) {
  const where = baseWhere(q);
  const pendingWhere: Prisma.ChecklistWhereInput = {
    ...where,
    AND: [
      { OR: [{ auditResult: 'REPROVED' }, { responses: { some: { response: 'NOK' } } }] },
      { OR: [{ repairStatus: null }, { repairStatus: 'NOK' }] },
    ],
  };
  const [total, inProgress, finalized, approved, reproved, pendingRepair, nokItems] = await prisma.$transaction([
    prisma.checklist.count({ where }),
    prisma.checklist.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.checklist.count({ where: { ...where, status: 'FINALIZED' } }),
    prisma.checklist.count({ where: { ...where, status: 'FINALIZED', auditResult: 'APPROVED' } }),
    prisma.checklist.count({ where: { ...where, status: 'FINALIZED', auditResult: 'REPROVED' } }),
    prisma.checklist.count({ where: pendingWhere }),
    prisma.checklistItemResponse.count({ where: { response: 'NOK', checklist: where } }),
  ]);
  return { total, inProgress, incomplete: inProgress, finalized, approved, reproved, pendingRepair, nokItems };
}

/** Checklists do dia na ordem de impressão: horário e chassi. */
export async function dailyChecklists(q: { date: string; shift?: 'FIRST' | 'SECOND'; includeInProgress?: boolean; ids?: string[] }) {
  const where = baseWhere({ date: q.date, shift: q.shift });
  if (q.includeInProgress === false) where.status = 'FINALIZED';
  if (q.ids?.length) where.id = { in: q.ids };
  return prisma.checklist.findMany({
    where,
    orderBy: [{ checklistTime: 'asc' }, { chassis: 'asc' }, { createdAt: 'asc' }],
    include: { responses: true },
  });
}

export async function daily(q: { date: string; shift?: 'FIRST' | 'SECOND'; blankSeparator?: boolean; includeInProgress?: boolean }) {
  const rows = await dailyChecklists({ date: q.date, shift: q.shift, includeInProgress: q.includeInProgress ?? true });
  return {
    date: q.date,
    shift: q.shift ?? null,
    blankSeparator: !!q.blankSeparator,
    vehicles: rows.map((r) => ({ id: r.id, chassis: r.chassis, time: r.checklistTime, shift: r.shift, status: r.status, auditResult: r.auditResult })),
    pages: planPages(rows.length, !!q.blankSeparator),
  };
}

export async function nonconformities(q: Filter) {
  const rows = await prisma.checklistItemResponse.findMany({
    where: { response: 'NOK', checklist: baseWhere(q) },
    include: { checklist: { select: { id: true, chassis: true, checklistDate: true, checklistTime: true, shift: true } } },
    orderBy: { checklist: { checklistDate: 'desc' } },
  });
  type G = { itemCode: string; label: string; section: string; count: number; occurrences: any[] };
  const grouped = new Map<string, G>();
  for (const r of rows) {
    const g: G = grouped.get(r.itemCode) ?? {
      itemCode: r.itemCode, label: ITEM_INDEX[r.itemCode]?.label ?? r.itemLabelSnapshot, section: r.section, count: 0, occurrences: [],
    };
    g.count++;
    g.occurrences.push({
      checklistId: r.checklist.id, chassis: r.checklist.chassis, date: r.checklist.checklistDate.toISOString().slice(0, 10),
      time: r.checklist.checklistTime, shift: r.checklist.shift, observation: r.observation,
    });
    grouped.set(r.itemCode, g);
  }
  return { totalNok: rows.length, items: [...grouped.values()].sort((a, b) => b.count - a.count) };
}
