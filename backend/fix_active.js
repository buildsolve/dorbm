const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const all = await p.equipment.findMany({ orderBy: { type: 'asc' } });
  all.forEach(e => console.log(`${e.name} (${e.type}) isActive=${e.isActive} powerKw=${e.powerKw}`));
}
main().finally(() => p.$disconnect());
