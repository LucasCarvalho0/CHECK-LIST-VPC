import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';

  // Administrador padrão
  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    await prisma.user.create({
      data: { name, username, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' },
    });
    console.log(`Administrador "${username}" criado.`);
  }

  // Administrador Lucas Carvalho (2º Turno)
  const lucas = await prisma.user.findUnique({ where: { username: '116221' } });
  if (!lucas) {
    await prisma.user.create({
      data: {
        name: 'Lucas Carvalho',
        username: '116221',
        passwordHash: await bcrypt.hash('116221@', 12),
        role: 'ADMIN',
        shift: 'SECOND',
      },
    });
    console.log('Administrador "Lucas Carvalho" (116221) criado.');
  } else if (!lucas.shift) {
    await prisma.user.update({ where: { username: '116221' }, data: { shift: 'SECOND' } });
  }

  // Operadores do 2º Turno
  const secondShiftUsers = [
    { username: 'augusto', name: 'José Augusto', password: '12345678', role: 'OPERATOR' as const, shift: 'SECOND' as const },
    { username: 'julio', name: 'Júlio Carvalho', password: '12345678', role: 'OPERATOR' as const, shift: 'SECOND' as const },
    { username: '499277', name: 'JOSE AUGUSTO', password: '12345678', role: 'OPERATOR' as const, shift: 'SECOND' as const },
    { username: '501425', name: 'JULIO CESAR', password: '12345678', role: 'OPERATOR' as const, shift: 'SECOND' as const },
  ];

  for (const op of secondShiftUsers) {
    await prisma.user.upsert({
      where: { username: op.username },
      create: {
        name: op.name,
        username: op.username,
        passwordHash: await bcrypt.hash(op.password, 12),
        role: op.role,
        shift: op.shift,
      },
      update: {
        shift: op.shift,
      },
    });
  }

  // 1º Turno: Líder Washington Wallace e Operadores (Márcio Luis e Tássio de Almeida)
  const firstShiftUsers = [
    { username: 'washington', name: 'Washington Wallace', password: '12345678', role: 'ADMIN' as const, shift: 'FIRST' as const },
    { username: '503175', name: 'Márcio Luis', password: '12345678', role: 'OPERATOR' as const, shift: 'FIRST' as const },
    { username: '504033', name: 'Tássio de Almeida', password: '12345678', role: 'OPERATOR' as const, shift: 'FIRST' as const },
    { username: 'marcio', name: 'Márcio Luis', password: '12345678', role: 'OPERATOR' as const, shift: 'FIRST' as const },
    { username: 'tassio', name: 'Tássio de Almeida', password: '12345678', role: 'OPERATOR' as const, shift: 'FIRST' as const },
  ];

  for (const op of firstShiftUsers) {
    await prisma.user.upsert({
      where: { username: op.username },
      create: {
        name: op.name,
        username: op.username,
        passwordHash: await bcrypt.hash(op.password, 12),
        role: op.role,
        shift: op.shift,
      },
      update: {
        name: op.name,
        role: op.role,
        shift: op.shift,
      },
    });
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
