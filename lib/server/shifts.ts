import { Prisma } from '@prisma/client';
import { toDateOnly } from './mapper';

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ShiftFilter {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  shift?: 'FIRST' | 'SECOND';
  shiftOvernight?: boolean;
}

/**
 * Constrói a cláusula Prisma para filtrar turnos considerando a virada da meia-noite do 2º Turno.
 * 
 * Regra de Negócio:
 * - 1º Turno: 06:00 às 15:59 do mesmo dia.
 * - 2º Turno: 16:00 às 02:00 / 05:00 da madrugada do dia seguinte (jornada estendida).
 */
export function buildShiftClause(q: ShiftFilter): Prisma.ChecklistWhereInput {
  const overnight = q.shiftOvernight !== false; // padrão: true para incluir a virada

  // 1. Intervalo explícito com data inicial e final diferentes
  if (q.dateFrom && q.dateTo && q.dateFrom !== q.dateTo) {
    const fromDate = toDateOnly(q.dateFrom);
    const toDate = toDateOnly(q.dateTo);

    if (q.shift === 'SECOND') {
      if (overnight) {
        const nextTo = toDateOnly(addDays(q.dateTo, 1));
        return {
          OR: [
            { checklistDate: { gte: fromDate, lte: toDate }, shift: 'SECOND' },
            { checklistDate: nextTo, shift: 'SECOND', checklistTime: { lte: '05:00' } },
          ],
        };
      }
      return { checklistDate: { gte: fromDate, lte: toDate }, shift: 'SECOND' };
    }

    if (q.shift === 'FIRST') {
      return { checklistDate: { gte: fromDate, lte: toDate }, shift: 'FIRST' };
    }

    if (overnight) {
      const nextTo = toDateOnly(addDays(q.dateTo, 1));
      return {
        OR: [
          { checklistDate: { gte: fromDate, lte: toDate } },
          { checklistDate: nextTo, shift: 'SECOND', checklistTime: { lte: '05:00' } },
        ],
      };
    }

    return { checklistDate: { gte: fromDate, lte: toDate } };
  }

  // 2. Data de referência única (seja passada em q.date ou q.dateFrom)
  const targetDate = q.date || q.dateFrom || (q.dateTo && !q.dateFrom ? q.dateTo : undefined);
  if (targetDate) {
    const curDate = toDateOnly(targetDate);
    const nextDate = toDateOnly(addDays(targetDate, 1));

    if (q.shift === 'SECOND') {
      if (overnight) {
        return {
          OR: [
            { checklistDate: curDate, shift: 'SECOND' },
            { checklistDate: nextDate, shift: 'SECOND', checklistTime: { lte: '05:00' } },
          ],
        };
      }
      return { checklistDate: curDate, shift: 'SECOND' };
    }

    if (q.shift === 'FIRST') {
      return {
        checklistDate: curDate,
        shift: 'FIRST',
      };
    }

    // Todos os turnos da data de produção
    if (overnight) {
      return {
        OR: [
          { checklistDate: curDate },
          { checklistDate: nextDate, shift: 'SECOND', checklistTime: { lte: '05:00' } },
        ],
      };
    }

    return { checklistDate: curDate };
  }

  // 3. Apenas filtro de turno sem data especificada
  const where: Prisma.ChecklistWhereInput = {};
  if (q.shift) where.shift = q.shift;
  return where;
}
