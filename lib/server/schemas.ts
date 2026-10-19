import { z } from 'zod';
import { normalizeChassis } from '@/lib/shared/catalog';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:mm).');
export const shiftEnum = z.enum(['FIRST', 'SECOND']);
const statusEnum = z.enum(['IN_PROGRESS', 'FINALIZED', 'CANCELED']);
const resultEnum = z.enum(['APPROVED', 'REPROVED']);
const repairEnum = z.enum(['OK', 'NOK', 'NOT_APPLICABLE']);
const responseEnum = z.enum(['OK', 'NOK', 'NA', 'UNANSWERED']);
const normChassis = z.string().transform(normalizeChassis);
const txt = z.string().nullable().optional();

export const createChecklistSchema = z.object({
  chassis: normChassis.pipe(z.string().min(1, 'Informe o chassi.')),
  vehicleVersion: z.string().optional(),
  checklistDate: date.optional(),
  checklistTime: time.optional(),
  shift: shiftEnum.optional(),
  inspectorQA: z.string().optional(),
  leaderVPC: z.string().optional(),
  bpc: z.string().optional(),
  /** confirma conscientemente uma nova inspeção com mesmo chassi e data */
  confirmDuplicate: z.boolean().optional(),
}).strict();

/** Todos os campos são opcionais: o PATCH só altera o que foi enviado (nunca apaga o restante). */
export const updateChecklistSchema = z.object({
  vehicleVersion: txt, inspectorQA: txt, leaderVPC: txt, bpc: txt, firmwareVersion: txt, canbusVersion: txt,
  nonConformityDescription: txt, repairObservation: txt, repairInspectorQA: txt, repairLeaderVPC: txt,
  chassis: normChassis.optional(),
  checklistDate: date.optional(),
  checklistTime: time.optional(),
  shift: shiftEnum.nullable().optional(),
  auditResult: resultEnum.nullable().optional(),
  repairStatus: repairEnum.nullable().optional(),
  repairDate: date.nullable().optional(),
  repairTime: time.nullable().optional(),
  items: z.array(z.object({
    itemCode: z.string().min(1),
    response: responseEnum.optional(),
    observation: z.string().nullable().optional(),
  }).strict()).optional(),
  /** updatedAt que o cliente conhece; se desatualizado, a API responde 409 (evita sobrescrita). */
  baseUpdatedAt: z.string().optional(),
}).strict();

export const cancelSchema = z.object({ reason: z.string().trim().min(1, 'Informe o motivo do cancelamento.') }).strict();

export const listChecklistsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().transform(normalizeChassis).optional(),
  date: date.optional(), dateFrom: date.optional(), dateTo: date.optional(),
  shift: shiftEnum.optional(), shiftOvernight: z.coerce.boolean().optional(),
  status: statusEnum.optional(), auditResult: resultEnum.optional(),
  inspectorQA: z.string().optional(), leaderVPC: z.string().optional(), bpc: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const summaryQuerySchema = z.object({
  date: date.optional(),
  dateFrom: date.optional(),
  dateTo: date.optional(),
  shift: shiftEnum.optional(),
  shiftOvernight: z.coerce.boolean().optional(),
});
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
export const dailyQuerySchema = z.object({
  date: date, shift: shiftEnum.optional(), shiftOvernight: z.coerce.boolean().optional(),
  blankSeparator: bool.optional(), includeInProgress: bool.optional(),
});
export const nonconformityQuerySchema = z.object({ dateFrom: date.optional(), dateTo: date.optional(), shift: shiftEnum.optional() });
export const dailyPdfSchema = z.object({
  date: date, shift: shiftEnum.optional(), blankSeparator: z.boolean().optional(), includeInProgress: z.boolean().optional(),
  ids: z.array(z.string().uuid()).max(500).optional(),
}).strict();

export const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) }).strict();
const roleEnum = z.enum(['ADMIN', 'OPERATOR', 'VIEWER']);
const pwd = z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.');
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, 'Login deve ter 3-40 caracteres (letras minúsculas, números, . _ -).'),
  password: pwd, role: roleEnum,
  shift: shiftEnum.nullable().optional(),
}).strict();
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: roleEnum.optional(),
  shift: shiftEnum.nullable().optional(),
  password: pwd.optional(),
}).strict();
export const setActiveSchema = z.object({ active: z.boolean() }).strict();

export type CreateChecklistDto = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistDto = z.infer<typeof updateChecklistSchema>;
export type ListChecklistsDto = z.infer<typeof listChecklistsSchema>;
