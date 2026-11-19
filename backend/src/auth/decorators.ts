import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
export type RoleName = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: RoleName;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
