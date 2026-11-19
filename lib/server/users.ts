import * as bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { HttpError } from './http';

const select = { id: true, name: true, username: true, role: true, active: true, createdAt: true } as const;
type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export const listUsers = () => prisma.user.findMany({ select, orderBy: { name: 'asc' } });

export async function createUser(dto: { name: string; username: string; password: string; role: Role }) {
  if (await prisma.user.findUnique({ where: { username: dto.username } })) throw new HttpError(409, 'Já existe um usuário com esse login.');
  return prisma.user.create({
    data: { name: dto.name, username: dto.username, role: dto.role, passwordHash: await bcrypt.hash(dto.password, 12) },
    select,
  });
}

async function mustExist(id: string) {
  if (!(await prisma.user.findUnique({ where: { id } }))) throw new HttpError(404, 'Usuário não encontrado.');
}

export async function updateUser(id: string, dto: { name?: string; role?: Role; password?: string }, actorId: string) {
  await mustExist(id);
  if (id === actorId && dto.role && dto.role !== 'ADMIN') throw new HttpError(400, 'Você não pode remover seu próprio papel de administrador.');
  return prisma.user.update({
    where: { id },
    data: {
      ...(dto.name && { name: dto.name }),
      ...(dto.role && { role: dto.role }),
      ...(dto.password && { passwordHash: await bcrypt.hash(dto.password, 12) }),
    },
    select,
  });
}

export async function setUserActive(id: string, active: boolean, actorId: string) {
  await mustExist(id);
  if (id === actorId && !active) throw new HttpError(400, 'Você não pode desativar o próprio usuário.');
  return prisma.user.update({ where: { id }, data: { active }, select });
}
