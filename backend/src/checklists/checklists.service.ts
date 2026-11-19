import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators';
import { ALL_ITEMS, ITEM_INDEX, normalizeChassis } from '../shared/catalog';
import { validateForFinalize } from '../shared/rules';
import { CancelChecklistDto, CreateChecklistDto, ListChecklistsDto, UpdateChecklistDto } from './checklists.dto';
import { emptyToNull, fromDate, nowInTz, serializeChecklist, toDateOnly, toRuleInput } from './checklist.mapper';

const include = { responses: true } as const;
const TEXT_FIELDS = [
  'vehicleVersion', 'inspectorQA', 'leaderVPC', 'bpc', 'firmwareVersion', 'canbusVersion', 'nonConformityDescription',
  'repairObservation', 'repairInspectorQA', 'repairLeaderVPC',
] as const;
const BOOL_FIELDS = ['isPCD', 'isL1', 'isL2', 'isL3'] as const;

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  // ---------- criação ----------
  async create(dto: CreateChecklistDto, user: AuthUser) {
    const now = nowInTz();
    const date = dto.checklistDate ?? now.date;
    const chassis = normalizeChassis(dto.chassis);
    if (!chassis) throw new BadRequestException({ message: 'Informe o chassi.', errors: [{ field: 'chassis', message: 'Informe o chassi.' }] });

    if (!dto.confirmDuplicate) {
      const existing = await this.prisma.checklist.findMany({
        where: { chassis, checklistDate: toDateOnly(date), deletedAt: null, status: { not: 'CANCELED' } },
        select: { id: true, status: true, checklistTime: true, shift: true },
      });
      if (existing.length) {
        throw new ConflictException({
          code: 'DUPLICATE',
          message: 'Já existe checklist para este chassi nesta data. Consulte o registro existente ou confirme uma nova inspeção.',
          existing,
        });
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
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
          isPCD: dto.isPCD ?? false,
          isL1: dto.isL1 ?? false,
          isL2: dto.isL2 ?? false,
          isL3: dto.isL3 ?? false,
          createdById: user.id,
          responses: {
            create: ALL_ITEMS.map((i) => ({ itemCode: i.code, section: i.section, itemLabelSnapshot: i.label, response: 'UNANSWERED' as const })),
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
  async findOne(id: string) {
    const cl = await this.prisma.checklist.findFirst({ where: { id, deletedAt: null }, include });
    if (!cl) throw new NotFoundException('Checklist não encontrado.');
    return serializeChecklist(cl);
  }

  buildWhere(q: ListChecklistsDto): Prisma.ChecklistWhereInput {
    const where: Prisma.ChecklistWhereInput = { deletedAt: null };
    if (q.search) where.chassis = { contains: q.search, mode: 'insensitive' };
    if (q.date) where.checklistDate = toDateOnly(q.date);
    else if (q.dateFrom || q.dateTo) {
      where.checklistDate = { ...(q.dateFrom && { gte: toDateOnly(q.dateFrom) }), ...(q.dateTo && { lte: toDateOnly(q.dateTo) }) };
    }
    if (q.shift) where.shift = q.shift;
    if (q.status) where.status = q.status;
    if (q.auditResult) where.auditResult = q.auditResult;
    if (q.inspectorQA) where.inspectorQA = { contains: q.inspectorQA, mode: 'insensitive' };
    if (q.leaderVPC) where.leaderVPC = { contains: q.leaderVPC, mode: 'insensitive' };
    if (q.bpc) where.bpc = { contains: q.bpc, mode: 'insensitive' };
    return where;
  }

  async findAll(q: ListChecklistsDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.buildWhere(q);
    const order = q.order ?? 'desc';
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.checklist.count({ where }),
      this.prisma.checklist.findMany({
        where,
        orderBy: [{ checklistDate: order }, { checklistTime: order }, { chassis: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { responses: { where: { response: 'NOK' }, select: { itemCode: true } } },
      }),
    ]);
    return {
      data: rows.map(({ responses, ...c }) => ({ ...c, checklistDate: fromDate(c.checklistDate), repairDate: fromDate(c.repairDate), nokCount: responses.length })),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async searchByChassis(chassis: string) {
    const rows = await this.prisma.checklist.findMany({
      where: { chassis: normalizeChassis(chassis), deletedAt: null },
      orderBy: [{ checklistDate: 'desc' }, { checklistTime: 'desc' }],
      take: 50,
    });
    return rows.map((c) => ({ ...c, checklistDate: fromDate(c.checklistDate), repairDate: fromDate(c.repairDate) }));
  }

  // ---------- permissões ----------
  private assertCanEdit(status: string, user: AuthUser) {
    if (user.role === 'VIEWER') throw new ForbiddenException('Perfil de consulta não pode editar checklists.');
    if (status === 'CANCELED') throw new ForbiddenException('Checklist cancelado não pode ser alterado.');
    if (status === 'FINALIZED' && user.role !== 'ADMIN')
      throw new ForbiddenException('Checklist finalizado só pode ser corrigido por um administrador.');
  }

  // ---------- atualização ----------
  async update(id: string, dto: UpdateChecklistDto, user: AuthUser) {
    const current = await this.prisma.checklist.findFirst({ where: { id, deletedAt: null }, include });
    if (!current) throw new NotFoundException('Checklist não encontrado.');
    this.assertCanEdit(current.status, user);

    if (dto.baseUpdatedAt && new Date(dto.baseUpdatedAt).getTime() !== current.updatedAt.getTime()) {
      throw new ConflictException({ code: 'STALE', message: 'Este checklist foi alterado em outra sessão. Recarregue antes de continuar.' });
    }

    const data: Prisma.ChecklistUpdateManyMutationInput = {};
    for (const f of TEXT_FIELDS) if (dto[f] !== undefined) (data as any)[f] = emptyToNull(dto[f]);
    for (const f of BOOL_FIELDS) if (dto[f] !== undefined) (data as any)[f] = dto[f] ?? false;
    if (dto.chassis !== undefined) {
      if (!dto.chassis) throw new BadRequestException('O chassi não pode ficar vazio.');
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
      if (!def) throw new BadRequestException(`Item desconhecido: ${it.itemCode}`);
      if (it.response === 'NA' && !def.allowNA) throw new BadRequestException(`NA não é permitido no item ${it.itemCode}.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Trava otimista: só atualiza se ninguém alterou o registro desde a leitura.
      const res = await tx.checklist.updateMany({
        where: { id, updatedAt: current.updatedAt },
        data: { ...data, updatedAt: new Date() },
      });
      if (res.count === 0) throw new ConflictException({ code: 'STALE', message: 'Este checklist foi alterado em outra sessão. Recarregue antes de continuar.' });

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
        const changes = this.diff(serializeChecklist(current), serializeChecklist(after));
        await tx.auditLog.create({ data: { checklistId: id, userId: user.id, action: 'CORRECTION', changes: changes as Prisma.InputJsonValue } });
      }
      return after;
    });
    return serializeChecklist(updated);
  }

  private diff(before: any, after: any) {
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
  async finalize(id: string, user: AuthUser) {
    if (user.role === 'VIEWER') throw new ForbiddenException('Perfil de consulta não pode finalizar checklists.');
    const cl = await this.findOne(id);
    if (cl.status !== 'IN_PROGRESS') throw new BadRequestException('Somente checklists em preenchimento podem ser finalizados.');
    const { checklist, responses } = toRuleInput(cl);
    const errors = validateForFinalize(checklist, responses);
    if (errors.length) throw new UnprocessableEntityException({ message: 'Checklist incompleto: há campos pendentes.', errors });

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.checklist.update({ where: { id }, data: { status: 'FINALIZED', finalizedAt: new Date() }, include });
      await tx.auditLog.create({ data: { checklistId: id, userId: user.id, action: 'FINALIZE', changes: { auditResult: u.auditResult } } });
      return u;
    });
    return serializeChecklist(updated);
  }

  async cancel(id: string, dto: CancelChecklistDto, user: AuthUser) {
    const cl = await this.findOne(id);
    if (cl.status === 'CANCELED') throw new BadRequestException('Checklist já está cancelado.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.checklist.update({
        where: { id }, data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: dto.reason }, include,
      });
      await tx.auditLog.create({ data: { checklistId: id, userId: user.id, action: 'CANCEL', changes: { reason: dto.reason, statusAnterior: cl.status } } });
      return u;
    });
    return serializeChecklist(updated);
  }

  history(id: string) {
    return this.prisma.auditLog.findMany({
      where: { checklistId: id }, orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, username: true } } },
    });
  }
}
