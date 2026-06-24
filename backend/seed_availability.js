const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const emps = await p.employee.findMany();
  for (const e of emps) {
    let days;
    if (e.name.includes('Wochenende') || e.notes?.includes('Sa/So')) {
      days = ['SAT'];
    } else {
      days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    }
    await p.employee.update({ where: { id: e.id }, data: { availableDays: JSON.stringify(days) } });
    console.log(`${e.name} → ${days.join(', ')}`);
  }
  console.log('✓ Done');
}
main().catch(console.error).finally(() => p.$disconnect());
