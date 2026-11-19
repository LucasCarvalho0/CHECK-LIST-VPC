const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then(n => { console.log('Usuarios no banco:', n); return p.$disconnect(); })
  .catch(e => { console.log('ERRO PRISMA:', e.message); process.exit(1); });
