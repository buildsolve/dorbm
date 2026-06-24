const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/Public/cakeerp/backend/prisma/dev.db' } } });
p.user.findMany({ select: { email: true, role: true } }).then(u => { console.log(JSON.stringify(u)); p.$disconnect(); });
