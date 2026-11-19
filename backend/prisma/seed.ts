import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';
  if (!password || password.length < 8) {
    throw new Error('Defina SEED_ADMIN_PASSWORD (mínimo 8 caracteres) no backend/.env antes de rodar o seed.');
  }
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Usuário "${username}" já existe; nada a fazer.`);
    return;
  }
  await prisma.user.create({
    data: { name, username, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' },
  });
  console.log(`Administrador "${username}" criado. Troque a senha após o primeiro acesso.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
