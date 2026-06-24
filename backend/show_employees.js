const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
p.employee.findMany().then(r => { console.log(JSON.stringify(r, null, 2)); p.$disconnect(); });
