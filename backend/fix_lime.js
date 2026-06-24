const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
p.product.updateMany({ where: { name: { contains: 'Lime Mini' } }, data: { isActive: false } })
  .then(r => console.log('deactivated:', r.count))
  .finally(() => p.$disconnect());
