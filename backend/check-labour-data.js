const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const plans = await p.weeklyPlan.findMany({ include: { tasks: { select: { estimatedMinutes: true } } } });
  console.log('WeeklyPlans:', plans.length);
  for (const w of plans) {
    console.log('  ', w.year, 'KW', w.weekNumber, 'start', w.weekStart.toISOString().slice(0, 10),
      'tasks', w.tasks.length, 'sumMin', w.tasks.reduce((s, t) => s + t.estimatedMinutes, 0));
  }
  const byStatus = await p.productionBatch.groupBy({ by: ['status'], _count: true });
  console.log('Batches by status:', JSON.stringify(byStatus));
  const done = await p.productionBatch.findMany({ where: { status: 'COMPLETED' }, select: { completedAt: true, actualQty: true } });
  console.log('Completed batches:', done.length, JSON.stringify(done.slice(0, 5)));
  await p.$disconnect();
})();
