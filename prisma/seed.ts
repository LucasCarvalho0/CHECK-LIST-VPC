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
      },
    });
    console.log('Administrador "Lucas Carvalho" (116221) criado.');
  }

  // Operadores do 2º Turno: José Augusto e Júlio Carvalho
  const operators = [
    { username: 'augusto', name: 'José Augusto', password: '12345678' },
    { username: 'julio', name: 'Júlio Carvalho', password: '12345678' },
  ];

  for (const op of operators) {
    await prisma.user.upsert({
      where: { username: op.username },
      create: {
        name: op.name,
        username: op.username,
        passwordHash: await bcrypt.hash(op.password, 12),
        role: 'OPERATOR',
      },
      update: {
        name: op.name,
      },
    });
    console.log(`Operador "${op.name}" (${op.username}) sincronizado.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
