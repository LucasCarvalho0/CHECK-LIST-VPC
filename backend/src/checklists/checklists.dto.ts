import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, ValidateNested, IsArray,
} from 'class-validator';
import { normalizeChassis } from '../shared/catalog';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateMsg = { message: 'Data inválida (use AAAA-MM-DD).' };
const timeMsg = { message: 'Horário inválido (use HH:mm).' };

export enum ShiftDto { FIRST = 'FIRST', SECOND = 'SECOND' }
export enum AuditResultDto { APPROVED = 'APPROVED', REPROVED = 'REPROVED' }
export enum RepairStatusDto { OK = 'OK', NOK = 'NOK', NOT_APPLICABLE = 'NOT_APPLICABLE' }
export enum StatusDto { IN_PROGRESS = 'IN_PROGRESS', FINALIZED = 'FINALIZED', CANCELED = 'CANCELED' }
export enum ResponseDto { OK = 'OK', NOK = 'NOK', NA = 'NA', UNANSWERED = 'UNANSWERED' }

const normChassis = Transform(({ value }) => (typeof value === 'string' ? normalizeChassis(value) : value));

export class CreateChecklistDto {
  @normChassis @IsString() @IsNotEmpty({ message: 'Informe o chassi.' }) chassis: string;
  @IsOptional() @IsString() vehicleVersion?: string;
  @IsOptional() @Matches(DATE, dateMsg) checklistDate?: string;
  @IsOptional() @Matches(TIME, timeMsg) checklistTime?: string;
  @IsOptional() @IsEnum(ShiftDto) shift?: ShiftDto;
  @IsOptional() @IsString() inspectorQA?: string;
  @IsOptional() @IsString() leaderVPC?: string;
  @IsOptional() @IsString() bpc?: string;
  @IsOptional() @IsBoolean() isPCD?: boolean;
  @IsOptional() @IsBoolean() isL1?: boolean;
  @IsOptional() @IsBoolean() isL2?: boolean;
  @IsOptional() @IsBoolean() isL3?: boolean;
  /** Confirma conscientemente uma nova inspeção com mesmo chassi e data */
  @IsOptional() @IsBoolean() confirmDuplicate?: boolean;
}

export class ItemUpdateDto {
  @IsString() @IsNotEmpty() itemCode: string;
  @IsOptional() @IsEnum(ResponseDto) response?: ResponseDto;
  @IsOptional() @IsString() observation?: string | null;
}

/** Todos os campos são opcionais: o PATCH só altera o que foi enviado (nunca apaga o restante). */
export class UpdateChecklistDto {
  @IsOptional() @IsString() vehicleVersion?: string | null;
  @normChassis @IsOptional() @IsString() chassis?: string;
  @IsOptional() @Matches(DATE, dateMsg) checklistDate?: string;
  @IsOptional() @Matches(TIME, timeMsg) checklistTime?: string;
  @IsOptional() @IsEnum(ShiftDto) shift?: ShiftDto | null;
  @IsOptional() @IsString() inspectorQA?: string | null;
  @IsOptional() @IsString() leaderVPC?: string | null;
  @IsOptional() @IsString() bpc?: string | null;
  @IsOptional() @IsBoolean() isPCD?: boolean | null;
  @IsOptional() @IsBoolean() isL1?: boolean | null;
  @IsOptional() @IsBoolean() isL2?: boolean | null;
  @IsOptional() @IsBoolean() isL3?: boolean | null;
  @IsOptional() @IsString() firmwareVersion?: string | null;
  @IsOptional() @IsString() canbusVersion?: string | null;
  @IsOptional() @IsEnum(AuditResultDto) auditResult?: AuditResultDto | null;
  @IsOptional() @IsString() nonConformityDescription?: string | null;
  @IsOptional() @IsEnum(RepairStatusDto) repairStatus?: RepairStatusDto | null;
  @IsOptional() @IsString() repairObservation?: string | null;
  @IsOptional() @IsString() repairInspectorQA?: string | null;
  @IsOptional() @IsString() repairLeaderVPC?: string | null;
  @IsOptional() @Matches(DATE, dateMsg) repairDate?: string | null;
  @IsOptional() @Matches(TIME, timeMsg) repairTime?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemUpdateDto) items?: ItemUpdateDto[];
  /** updatedAt que o cliente conhece; se estiver desatualizado, a API responde 409 (evita sobrescrita). */
  @IsOptional() @IsString() baseUpdatedAt?: string;
}

export class CancelChecklistDto {
  @IsString() @IsNotEmpty({ message: 'Informe o motivo do cancelamento.' }) reason: string;
}

export class ListChecklistsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number = 20;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? normalizeChassis(value) : value)) @IsString() search?: string;
  @IsOptional() @Matches(DATE, dateMsg) date?: string;
  @IsOptional() @Matches(DATE, dateMsg) dateFrom?: string;
  @IsOptional() @Matches(DATE, dateMsg) dateTo?: string;
  @IsOptional() @IsEnum(ShiftDto) shift?: ShiftDto;
  @IsOptional() @IsEnum(StatusDto) status?: StatusDto;
  @IsOptional() @IsEnum(AuditResultDto) auditResult?: AuditResultDto;
  @IsOptional() @IsString() inspectorQA?: string;
  @IsOptional() @IsString() leaderVPC?: string;
  @IsOptional() @IsString() bpc?: string;
  @IsOptional() @IsEnum({ asc: 'asc', desc: 'desc' }) order?: 'asc' | 'desc' = 'desc';
}
