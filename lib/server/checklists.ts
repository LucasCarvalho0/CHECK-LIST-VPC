import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { HttpError } from './http';
import type { AuthUser } from './auth';
import { ALL_ITEMS, ITEM_INDEX, normalizeChassis } from '@/lib/shared/catalog';
import { validateForFinalize } from '@/lib/shared/rules';
import type { CreateChecklistDto, ListChecklistsDto, UpdateChecklistDto } from './schemas';
import { emptyToNull, fromDate, nowInTz, serializeChecklist, toDateOnly, toRuleInput } from './mapper';
import { buildShiftClause } from './shifts';

const include = { responses: true } as const;
const TEXT_FIELDS = [
  'vehicleVersion', 'inspectorQA', 'leaderVPC', 'bpc', 'firmwareVersion', 'canbusVersion', 'nonConformityDescription',
  'repairObservation', 'repairInspectorQA', 'repairLeaderVPC',
] as const;

// ---------- criação ----------
export async function createChecklist(dto: CreateChecklistDto, user: AuthUser) {
  const now = nowInTz();
  const date = dto.checklistDate ?? now.date;
  const chassis = normalizeChassis(dto.chassis);

  if (!dto.confirmDuplicate) {
    const existing = await prisma.checklist.findMany({
      where: { chassis, checklistDate: toDateOnly(date), deletedAt: null, status: { not: 'CANCELED' } },
      select: { id: true, status: true, checklistTime: true, shift: true },
    });
    if (existing.length) {
      throw new HttpError(409, 'Já existe checklist para este chassi nesta data. Consulte o registro existente ou confirme uma nova inspeção.', {
        code: 'DUPLICATE', existing,
      });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const cl = await tx.checklist.create({
      data: {
        chassis,
        checklistDate: toDateOnly(date),
        checklistTime: dto.checklistTime ?? now.time,
        shift: dto.shift ?? null,
        vehicleVersion: emptyToNull(dto.vehicleVersion) ?? null,
        inspectorQA: emptyToNull(dto.inspectorQA) ?? null,
        leaderVPC: emptyToNull(dto.leaderVPC) ?? null,
        bpc: emptyToNull(dto.bpc) ?? null,
        createdById: user.id,
        auditResult: 'APPROVED',
        responses: {
          create: ALL_ITEMS.map((i) => ({ itemCode: i.code, section: i.section, itemLabelSnapshot: i.label, response: 'OK' as const })),
        },
      },
      include,
    });
    await tx.auditLog.create({ data: { checklistId: cl.id, userId: user.id, action: 'CREATE', changes: { chassis, date } } });
    return cl;
  });
  return serializeChecklist(created);
}

// ---------- consulta ----------
export async function getChecklist(id: string) {
  const cl = await prisma.checklist.findFirst({ where: { id, deletedAt: null }, include });
  if (!cl) throw new HttpError(404, 'Checklist não encontrado.');
  return serializeChecklist(cl);
}

export function buildWhere(q: Partial<ListChecklistsDto>): Prisma.ChecklistWhereInput {
  const where: Prisma.ChecklistWhereInput = { deletedAt: null };
  if (q.search) where.chassis = { contains: q.search, mode: 'insensitive' };
  if (q.status) where.status = q.status;
  if (q.auditResult) where.auditResult = q.auditResult;
  if (q.inspectorQA) where.inspectorQA = { contains: q.inspectorQA, mode: 'insensitive' };
  if (q.leaderVPC) where.leaderVPC = { contains: q.leaderVPC, mode: 'insensitive' };
  if (q.bpc) where.bpc = { contains: q.bpc, mode: 'insensitive' };

  const shiftClause = buildShiftClause({
    date: q.date,
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
    shift: q.shift,
    shiftOvernight: q.shiftOvernight,
  });

  return {
    AND: [
      where,
      shiftClause,
    ],
  };
}

export async function listChecklists(q: ListChecklistsDto) {
  const where = buildWhere(q);
  const [total, rows] = await prisma.$transaction([
    prisma.checklist.count({ where }),
    prisma.checklist.findMany({
      where,
      orderBy: [{ checklistDate: q.order }, { checklistTime: q.order }, { chassis: 'asc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { responses: { where: { response: 'NOK' }, select: { itemCode: true } } },
    }),
  ]);
  return {
    data: rows.map(({ responses, ...c }) => ({ ...c, checklistDate: fromDate(c.checklistDate), repairDate: fromDate(c.repairDate), nokCount: responses.length })),
    meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
  };
}

export async function searchByChassis(chassis: string) {
  const rows = await prisma.checklist.findMany({
    where: { chassis: normalizeChassis(chassis), deletedAt: null },
    orderBy: [{ checklistDate: 'desc' }, { checklistTime: 'desc' }],
    take: 50,
  });
  return rows.map((c) => ({ ...c, checklistDate: fromDate(c.checklistDate), repairDate: fromDate(c.repairDate) }));
}

// ---------- permissões ----------
function assertCanEdit(status: string, user: AuthUser) {
  if (user.role === 'VIEWER') throw new HttpError(403, 'Perfil de consulta não pode editar checklists.');
  if (status === 'CANCELED') throw new HttpError(403, 'Checklist cancelado não pode ser alterado.');
  if (status === 'FINALIZED' && user.role !== 'ADMIN') throw new HttpError(403, 'Checklist finalizado só pode ser corrigido por um administrador.');
}
const STALE = () => new HttpError(409, 'Este checklist foi alterado em outra sessão. Recarregue antes de continuar.', { code: 'STALE' });

// ---------- atualização ----------
export async function updateChecklist(id: string, dto: UpdateChecklistDto, user: AuthUser) {
  const current = await prisma.checklist.findFirst({ where: { id, deletedAt: null }, include });
  if (!current) throw new HttpError(404, 'Checklist não encontrado.');
  assertCanEdit(current.status, user);

  if (dto.baseUpdatedAt && new Date(dto.baseUpdatedAt).getTime() !== current.updatedAt.getTime()) throw STALE();

  const data: Prisma.ChecklistUpdateManyMutationInput = {};
  for (const f of TEXT_FIELDS) if (dto[f] !== undefined) (data as any)[f] = emptyToNull(dto[f]);
  if (dto.chassis !== undefined) {
    if (!dto.chassis) throw new HttpError(400, 'O chassi não pode ficar vazio.');
    data.chassis = dto.chassis;
  }
  if (dto.checklistDate !== undefined) data.checklistDate = toDateOnly(dto.checklistDate);
  if (dto.checklistTime !== undefined) data.checklistTime = dto.checklistTime;
  if (dto.shift !== undefined) data.shift = dto.shift;
  if (dto.auditResult !== undefined) data.auditResult = dto.auditResult;
  if (dto.repairStatus !== undefined) data.repairStatus = dto.repairStatus;
  if (dto.repairDate !== undefined) data.repairDate = dto.repairDate ? toDateOnly(dto.repairDate) : null;
  if (dto.repairTime !== undefined) data.repairTime = dto.repairTime;

  for (const it of dto.items ?? []) {
    const def = ITEM_INDEX[it.itemCode];
    if (!def) throw new HttpError(400, `Item desconhecido: ${it.itemCode}`);
    if (it.response === 'NA' && !def.allowNA) throw new HttpError(400, `NA não é permitido no item ${it.itemCode}.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Trava otimista: só atualiza se ninguém alterou o registro desde a leitura.
    const res = await tx.checklist.updateMany({ where: { id, updatedAt: current.updatedAt }, data: { ...data, updatedAt: new Date() } });
    if (res.count === 0) throw STALE();

    // Upsert por item: atualizar um campo nunca apaga as outras respostas.
    for (const it of dto.items ?? []) {
      const def = ITEM_INDEX[it.itemCode];
      await tx.checklistItemResponse.upsert({
        where: { checklistId_itemCode: { checklistId: id, itemCode: it.itemCode } },
        create: {
          checklistId: id, itemCode: it.itemCode, section: def.section, itemLabelSnapshot: def.label,
          response: it.response ?? 'UNANSWERED', observation: emptyToNull(it.observation) ?? null,
        },
        update: {
          ...(it.response !== undefined && { response: it.response }),
          ...(it.observation !== undefined && { observation: emptyToNull(it.observation) }),
        },
      });
    }
    const after = await tx.checklist.findUniqueOrThrow({ where: { id }, include });

    if (current.status === 'FINALIZED') {
      const changes = diff(serializeChecklist(current), serializeChecklist(after));
      await tx.auditLog.create({ data: { checklistId: id, userId: user.id, action: 'CORRECTION', changes: changes as Prisma.InputJsonValue } });
    }
    return after;
  });
  return serializeChecklist(updated);
}

function diff(before: any, after: any) {
  const out: Record<string, { de: unknown; para: unknown }> = {};
  const skip = new Set(['updatedAt', 'responses', 'createdAt']);
  for (const k of Object.keys(after)) {
    if (skip.has(k)) continue;
    const a = before[k] instanceof Date ? before[k].toISOString() : before[k];
    const b = after[k] instanceof Date ? after[k].toISOString() : after[k];
    if (a !== b) out[k] = { de: a, para: b };
  }
  for (const r of after.responses) {
    const p = before.responses.find((x: any) => x.itemCode === r.itemCode);
    if (!p || p.response !== r.response) out[r.itemCode] = { de: p?.response ?? null, para: r.response };
    if (p && p.observation !== r.observation) out[`${r.itemCode}.obs`] = { de: p.observation, para: r.observation };
  }
  return out;
}

// ---------- finalizar / cancelar ----------
export async function finalizeChecklist(id: string, user: AuthUser) {
  if (user.role === 'VIEWER') throw new HttpError(403, 'Perfil de consulta não pode finalizar checklists.');
  const cl = await getChecklist(id);
  if (cl.status !== 'IN_PROGRESS') throw new HttpError(400, 'Somente checklists em preenchimento podem ser finalizados.');
  const { checklist, responses } = toRuleInput(cl);
  const errors = validateForFinalize(checklist, responses);
  if (errors.length) throw new HttpError(422, 'Checklist incompleto: há campos pendentes.', { errors });

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.checklist.update({ where: { id }, data: { status: 'FINALIZED', finalizedAt: new Date() }, include });
    await tx.auditLog.create({ data: { checklistId: id, userId: user.id, action: 'FINALIZE', changes: { auditResult: u.auditResult } } });
    return u;
  });
  return serializeChecklist(updated);
}

export async function cancelChecklist(id: string, reason: string, user: AuthUser) {
  const cl = await getChecklist(id);
  if (cl.status === 'CANCELED') throw new HttpError(400, 'Checklist já está cancelado.');
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.checklist.update({ where: { id }, data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: reason }, include });
    await tx.auditLog.create({ data: { checklistId: id, userId: user.id, action: 'CANCEL', changes: { reason, statusAnterior: cl.status } } });
    return u;
  });
  return serializeChecklist(updated);
}

export function checklistHistory(id: string) {
  return prisma.auditLog.findMany({
    where: { checklistId: id }, orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, username: true } } },
  });
}
