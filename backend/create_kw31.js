const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

const MIX = [
  { code: 'PRD_BUTTERCROISS_FR',  qty: 120, day: 'MON', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_MINISCHOKOCR_FR',  qty: 105, day: 'MON', assignedTo: 'Konditor 2 (P)' },
  { code: 'PRD_ZITRONENKUCH_FR',  qty:  30, day: 'MON', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_CAKEPOPS_EXT',     qty: 120, day: 'TUE', assignedTo: 'Konditor 2 (P)' },
  { code: 'PRD_ERDBEERTIRA_KCH',  qty:   3, day: 'TUE', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_HOPEKUCHEN_KCH',   qty:   3, day: 'TUE', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_LIEBEERE_KCH',     qty:   3, day: 'WED', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_SCHOKOHIMB_KCH',   qty:   3, day: 'WED', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_SCHOKOMARCJ_KCH',  qty:   3, day: 'WED', assignedTo: 'Konditor 2 (P)' },
  { code: 'PRD_SACHERTORT_EDS',   qty:  40, day: 'WED', assignedTo: 'Konditor 2 (P)' },
  { code: 'PRD_BAKEDCHEES_9Y3',   qty:  40, day: 'THU', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_MINICHEESE_NR7',   qty:  50, day: 'THU', assignedTo: 'Konditor 2 (P)' },
  { code: 'PRD_BANANABREA_83L',   qty:  20, day: 'THU', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_ROSEPISTAZ_TAR',   qty:  25, day: 'FRI', assignedTo: 'Konditor 2 (P)' },
  { code: 'PRD028',               qty:  25, day: 'FRI', assignedTo: 'Konditor 2 (P)' },
  { code: 'PRD029',               qty: 150, day: 'FRI', assignedTo: 'Konditor 1 (IW)' },
  { code: 'PRD_KULFIEIS_PED',     qty:  30, day: 'SAT', assignedTo: 'Aushilfe Wochenende' },
  { code: 'PRD_POPSICLES_Z8U',    qty:  30, day: 'SAT', assignedTo: 'Aushilfe Wochenende' },
];

async function main() {
  const products = await p.product.findMany({ where: { isActive: true } });
  const byCode = {};
  products.forEach(pr => { byCode[pr.code] = pr; });

  const plan = await p.weeklyPlan.create({
    data: {
      year: 2026,
      weekNumber: 31,
      weekStart: new Date('2026-07-27'),
      status: 'DRAFT',
      notes: 'Juli-Plan KW31 — Ziel €3400/Woche',
    },
  });
  console.log('Created KW31:', plan.id);

  for (const row of MIX) {
    const pr = byCode[row.code];
    if (!pr) { console.error('Missing:', row.code); continue; }
    await p.weeklyTask.create({
      data: {
        weeklyPlanId: plan.id,
        taskType: 'PRODUCTION',
        productId: pr.id,
        plannedDay: row.day,
        quantity: row.qty,
        status: 'PLANNED',
        cashAmount: row.qty * pr.sellingPrice,
        assignedTo: row.assignedTo,
      },
    });
    console.log(`  ${row.day} ${pr.name.padEnd(35)} → ${row.assignedTo}`);
  }
  console.log('✓ Done');
}
main().catch(console.error).finally(() => p.$disconnect());
