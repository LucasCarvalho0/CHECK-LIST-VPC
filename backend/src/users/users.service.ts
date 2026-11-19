import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, SetActiveDto, UpdateUserDto } from './users.dto';

const select = { id: true, name: true, username: true, role: true, active: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ select, orderBy: { name: 'asc' } });
  }

  async create(dto: CreateUserDto) {
    if (await this.prisma.user.findUnique({ where: { username: dto.username } }))
      throw new ConflictException('Já existe um usuário com esse login.');
    return this.prisma.user.create({
      data: { name: dto.name, username: dto.username, role: dto.role, passwordHash: await bcrypt.hash(dto.password, 12) },
      select,
    });
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    await this.get(id);
    if (id === actorId && dto.role && dto.role !== 'ADMIN')
      throw new BadRequestException('Você não pode remover seu próprio papel de administrador.');
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.role && { role: dto.role }),
        ...(dto.password && { passwordHash: await bcrypt.hash(dto.password, 12) }),
      },
      select,
    });
  }

  async setActive(id: string, dto: SetActiveDto, actorId: string) {
    await this.get(id);
    if (id === actorId && !dto.active) throw new BadRequestException('Você não pode desativar o próprio usuário.');
    return this.prisma.user.update({ where: { id }, data: { active: dto.active }, select });
  }

  private async get(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    return u;
  }
}
