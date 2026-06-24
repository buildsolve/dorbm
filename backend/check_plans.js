const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
p.weeklyPlan.findMany({ where: { year: 2026 }, select: { weekNumber: true, id: true }, orderBy: { weekNumber: 'asc' } })
  .then(r => { r.forEach(x => console.log('KW' + x.weekNumber, x.id)); p.$disconnect(); });
