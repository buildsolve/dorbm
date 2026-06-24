const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

const MAP = { MONDAY: 'MON', TUESDAY: 'TUE', WEDNESDAY: 'WED', THURSDAY: 'THU', FRIDAY: 'FRI', SATURDAY: 'SAT', SUNDAY: 'SUN' };

async function main() {
  for (const [from, to] of Object.entries(MAP)) {
    const r = await p.weeklyTask.updateMany({ where: { plannedDay: from }, data: { plannedDay: to } });
    if (r.count > 0) console.log(`${from} → ${to}: ${r.count} tasks`);
  }
  console.log('✓ Done');
}
main().catch(console.error).finally(() => p.$disconnect());
