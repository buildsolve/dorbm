const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
p.weeklyPlan.findMany({ select: { weekNumber: true, weekStart: true, status: true }, orderBy: { weekNumber: 'asc' } })
  .then(r => r.forEach(x => console.log(`KW${x.weekNumber}  weekStart=${x.weekStart?.toISOString()?.slice(0,10)}  status=${x.status}`)))
  .finally(() => p.$disconnect());
