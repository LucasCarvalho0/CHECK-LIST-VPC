import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { planPages } from '../common/page-plan';
import { ITEM_INDEX } from '../shared/catalog';
import { toDateOnly } from '../checklists/checklist.mapper';
import { DailyQueryDto, NonconformityQueryDto, SummaryQueryDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private baseWhere(q: { date?: string; dateFrom?: string; dateTo?: string; shift?: 'FIRST' | 'SECOND' }): Prisma.ChecklistWhereInput {
    const where: Prisma.ChecklistWhereInput = { deletedAt: null, status: { not: 'CANCELED' } };
    if (q.date) where.checklistDate = toDateOnly(q.date);
    else if (q.dateFrom || q.dateTo)
      where.checklistDate = { ...(q.dateFrom && { gte: toDateOnly(q.dateFrom) }), ...(q.dateTo && { lte: toDateOnly(q.dateTo) }) };
    if (q.shift) where.shift = q.shift;
    return where;
  }

  /**
   * Indicadores calculados do banco. "Aprovado/Reprovado" contam apenas checklists FINALIZADOS e seguem o
   * resultado escolhido pelo inspetor (finalizar != aprovar). Somente leitura.
   */
  async summary(q: SummaryQueryDto) {
    const where = this.baseWhere(q);
    const pendingWhere: Prisma.ChecklistWhereInput = {
      ...where,
      AND: [
        { OR: [{ auditResult: 'REPROVED' }, { responses: { some: { response: 'NOK' } } }] },
        { OR: [{ repairStatus: null }, { repairStatus: 'NOK' }] },
      ],
    };
    const [total, inProgress, finalized, approved, reproved, pendingRepair, nokItems] = await this.prisma.$transaction([
      this.prisma.checklist.count({ where }),
      this.prisma.checklist.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.checklist.count({ where: { ...where, status: 'FINALIZED' } }),
      this.prisma.checklist.count({ where: { ...where, status: 'FINALIZED', auditResult: 'APPROVED' } }),
      this.prisma.checklist.count({ where: { ...where, status: 'FINALIZED', auditResult: 'REPROVED' } }),
      this.prisma.checklist.count({ where: pendingWhere }),
      this.prisma.checklistItemResponse.count({ where: { response: 'NOK', checklist: where } }),
    ]);
    return { total, inProgress, incomplete: inProgress, finalized, approved, reproved, pendingRepair, nokItems };
  }

  /** Checklists do dia na ordem de impressão: horário e chassi. */
  async dailyChecklists(q: { date: string; shift?: 'FIRST' | 'SECOND'; includeInProgress?: boolean; ids?: string[] }) {
    const where = this.baseWhere({ date: q.date, shift: q.shift });
    if (q.includeInProgress === false) where.status = 'FINALIZED';
    if (q.ids?.length) where.id = { in: q.ids };
    return this.prisma.checklist.findMany({
      where,
      orderBy: [{ checklistTime: 'asc' }, { chassis: 'asc' }, { createdAt: 'asc' }],
      include: { responses: true },
    });
  }

  async daily(q: DailyQueryDto) {
    const rows = await this.dailyChecklists({ date: q.date, shift: q.shift, includeInProgress: q.includeInProgress ?? true });
    return {
      date: q.date,
      shift: q.shift ?? null,
      blankSeparator: !!q.blankSeparator,
      vehicles: rows.map((r) => ({
        id: r.id, chassis: r.chassis, time: r.checklistTime, shift: r.shift, status: r.status, auditResult: r.auditResult,
      })),
      pages: planPages(rows.length, !!q.blankSeparator),
    };
  }

  async nonconformities(q: NonconformityQueryDto) {
    const rows = await this.prisma.checklistItemResponse.findMany({
      where: { response: 'NOK', checklist: this.baseWhere(q) },
      include: { checklist: { select: { id: true, chassis: true, checklistDate: true, checklistTime: true, shift: true } } },
      orderBy: { checklist: { checklistDate: 'desc' } },
    });
    const grouped = new Map<string, { itemCode: string; label: string; section: string; count: number; occurrences: any[] }>();
    for (const r of rows) {
      const g: { itemCode: string; label: string; section: string; count: number; occurrences: any[] } = grouped.get(r.itemCode) ?? {
        itemCode: r.itemCode, label: ITEM_INDEX[r.itemCode]?.label ?? r.itemLabelSnapshot, section: r.section, count: 0, occurrences: [] as any[],
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
}
