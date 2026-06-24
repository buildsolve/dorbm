const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { email: true, role: true } })
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .finally(() => p.$disconnect());
