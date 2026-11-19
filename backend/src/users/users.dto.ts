import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export enum RoleDto { ADMIN = 'ADMIN', OPERATOR = 'OPERATOR', VIEWER = 'VIEWER' }

export class CreateUserDto {
  @IsString() @IsNotEmpty() name: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z0-9._-]{3,40}$/, { message: 'username deve ter 3-40 caracteres (letras minúsculas, números, . _ -)' })
  username: string;
  @IsString() @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' }) password: string;
  @IsEnum(RoleDto) role: RoleDto;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsEnum(RoleDto) role?: RoleDto;
  @IsOptional() @IsString() @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' }) password?: string;
}

export class SetActiveDto {
  @IsBoolean() active: boolean;
}
