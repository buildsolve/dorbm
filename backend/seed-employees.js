const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const TEAM = [
  { name: 'Konditor 1 (IW)', role: 'KONDITOR', weeklyHours: 40, hourlyRate: 19, notes: 'Vollzeit — Torten & Backtage' },
  { name: 'Konditor 2 (P)', role: 'KONDITOR', weeklyHours: 40, hourlyRate: 17, notes: 'Vollzeit — Tarts, Theke, Einpacken' },
  { name: 'Aushilfe Wochenende', role: 'AUSHILFE', weeklyHours: 12, hourlyRate: 14, notes: 'Sa/So — Theke & Spülen' },
];
(async () => {
  const existing = await p.employee.count();
  if (existing > 0) { console.log('employees already exist:', existing); process.exit(0); }
  for (const e of TEAM) { await p.employee.create({ data: e }); console.log('✓', e.name); }
  await p.$disconnect();
})();
