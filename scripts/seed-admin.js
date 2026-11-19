// Script para criar/garantir o usuario administrador principal
// Uso: node scripts/seed-admin.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = 'lucas';
  const password = '116221';
  const name = 'Lucas';
  const role = 'ADMIN';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    // Atualiza a senha e garante que é ADMIN ativo
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { username },
      data: { passwordHash: hash, role, active: true, name },
    });
    console.log(`✅ Usuário "${username}" atualizado com sucesso (ADMIN).`);
  } else {
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { username, passwordHash: hash, name, role, active: true },
    });
    console.log(`✅ Usuário "${username}" criado com sucesso (ADMIN).`);
  }
}

main()
  .catch((e) => { console.error('❌ Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
