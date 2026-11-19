import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { ShiftDto } from '../checklists/checklists.dto';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const bool = Transform(({ value }) => value === true || value === 'true');

export class SummaryQueryDto {
  @IsOptional() @Matches(DATE) date?: string;
  @IsOptional() @Matches(DATE) dateFrom?: string;
  @IsOptional() @Matches(DATE) dateTo?: string;
  @IsOptional() @IsEnum(ShiftDto) shift?: ShiftDto;
}

export class DailyQueryDto {
  @Matches(DATE, { message: 'Informe a data (AAAA-MM-DD).' }) date: string;
  @IsOptional() @IsEnum(ShiftDto) shift?: ShiftDto;
  @IsOptional() @bool @IsBoolean() blankSeparator?: boolean;
  @IsOptional() @bool @IsBoolean() includeInProgress?: boolean;
}

export class NonconformityQueryDto {
  @IsOptional() @Matches(DATE) dateFrom?: string;
  @IsOptional() @Matches(DATE) dateTo?: string;
  @IsOptional() @IsEnum(ShiftDto) shift?: ShiftDto;
}

export class DailyPdfDto {
  @Matches(DATE, { message: 'Informe a data (AAAA-MM-DD).' }) date: string;
  @IsOptional() @IsEnum(ShiftDto) shift?: ShiftDto;
  @IsOptional() @IsBoolean() blankSeparator?: boolean;
  @IsOptional() @IsBoolean() includeInProgress?: boolean;
  /** Se enviado, imprime somente estes checklists (mantendo a ordem padrão por horário/chassi). */
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsUUID('4', { each: true }) ids?: string[];
}
