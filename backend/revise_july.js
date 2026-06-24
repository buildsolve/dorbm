const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

// July 2026: KW27-31
const WEEKS = [
  { weekNumber: 27, weekStart: new Date('2026-06-29') },
  { weekNumber: 28, weekStart: new Date('2026-07-06') },
  { weekNumber: 29, weekStart: new Date('2026-07-13') },
  { weekNumber: 30, weekStart: new Date('2026-07-20') },
  { weekNumber: 31, weekStart: new Date('2026-07-27') },
];

// Mix using active product codes — quantities tuned to hit €3,400/week
// Total per week: €3,399.50 × 5 weeks = €16,997.50
const MIX = [
  // Monday — Frühstück & Croissants
  { code: 'PRD_BUTTERCROISS_FR',  qty: 120, day: 'MONDAY' },   // €3.20 × 120 = €384
  { code: 'PRD_MINISCHOKOCR_FR',  qty: 105, day: 'MONDAY' },   // €2.80 × 105 = €294
  { code: 'PRD_ZITRONENKUCH_FR',  qty:  30, day: 'MONDAY' },   // €5.50 × 30  = €165

  // Tuesday — Cake Pops & signature Kuchen
  { code: 'PRD_CAKEPOPS_EXT',     qty: 120, day: 'TUESDAY' },  // €3.00 × 120 = €360
  { code: 'PRD_ERDBEERTIRA_KCH',  qty:   3, day: 'TUESDAY' },  // €32   × 3   = €96
  { code: 'PRD_HOPEKUCHEN_KCH',   qty:   3, day: 'TUESDAY' },  // €30   × 3   = €90

  // Wednesday — Torten & Sacher
  { code: 'PRD_LIEBEERE_KCH',     qty:   3, day: 'WEDNESDAY' },// €28   × 3   = €84
  { code: 'PRD_SCHOKOHIMB_KCH',   qty:   3, day: 'WEDNESDAY' },// €30   × 3   = €90
  { code: 'PRD_SCHOKOMARCJ_KCH',  qty:   3, day: 'WEDNESDAY' },// €34   × 3   = €102
  { code: 'PRD_SACHERTORT_EDS',   qty:  40, day: 'WEDNESDAY' },// €4.60 × 40  = €184

  // Thursday — Cheesecakes & Brot
  { code: 'PRD_BAKEDCHEES_9Y3',   qty:  40, day: 'THURSDAY' }, // €4.90 × 40  = €196
  { code: 'PRD_MINICHEESE_NR7',   qty:  50, day: 'THURSDAY' }, // €3.90 × 50  = €195
  { code: 'PRD_BANANABREA_83L',   qty:  20, day: 'THURSDAY' }, // €8.90 × 20  = €178

  // Friday — Tarts & Cookies
  { code: 'PRD_ROSEPISTAZ_TAR',   qty:  25, day: 'FRIDAY' },   // €6.50 × 25  = €162.50
  { code: 'PRD028',               qty:  25, day: 'FRIDAY' },   // €6.00 × 25  = €150
  { code: 'PRD029',               qty: 150, day: 'FRIDAY' },   // €2.50 × 150 = €375

  // Saturday — Eis & Kalt
  { code: 'PRD_KULFIEIS_PED',     qty:  30, day: 'SATURDAY' }, // €4.90 × 30  = €147
  { code: 'PRD_POPSICLES_Z8U',    qty:  30, day: 'SATURDAY' }, // €4.90 × 30  = €147
];

async function main() {
  // Load active products
  const products = await p.product.findMany({ where: { isActive: true } });
  const byCode = {};
  products.forEach(pr => { byCode[pr.code] = pr; });

  // Verify all codes exist
  for (const row of MIX) {
    if (!byCode[row.code]) {
      console.error(`ERROR: product code ${row.code} not found or inactive!`);
      process.exit(1);
    }
  }

  // Preview revenue
  const weeklyRevenue = MIX.reduce((s, r) => s + r.qty * byCode[r.code].sellingPrice, 0);
  console.log(`Weekly revenue: €${weeklyRevenue.toFixed(2)}`);
  console.log(`Monthly revenue (×5): €${(weeklyRevenue * 5).toFixed(2)}`);
  console.log();

  // Delete existing KW27-31 plans
  for (const week of WEEKS) {
    const existing = await p.weeklyPlan.findFirst({ where: { year: 2026, weekNumber: week.weekNumber } });
    if (existing) {
      await p.weeklyTask.deleteMany({ where: { weeklyPlanId: existing.id } });
      await p.weeklyPlan.delete({ where: { id: existing.id } });
      console.log(`Deleted existing KW${week.weekNumber}`);
    }
  }

  // Create new plans
  for (const week of WEEKS) {
    const plan = await p.weeklyPlan.create({
      data: {
        year: 2026,
        weekNumber: week.weekNumber,
        weekStart: week.weekStart,
        status: 'DRAFT',
        notes: `Juli-Plan KW${week.weekNumber} — Ziel €${weeklyRevenue.toFixed(0)}/Woche`,
      },
    });
    console.log(`\nCreated KW${week.weekNumber} (${plan.id})`);

    for (const row of MIX) {
      const pr = byCode[row.code];
      await p.weeklyTask.create({
        data: {
          weeklyPlanId: plan.id,
          taskType: 'PRODUCTION',
          productId: pr.id,
          plannedDay: row.day,
          quantity: row.qty,
          status: 'PLANNED',
          cashAmount: row.qty * pr.sellingPrice,
        },
      });
      console.log(`  ${row.day.padEnd(10)} ${pr.name.padEnd(35)} ${String(row.qty).padStart(4)} × €${pr.sellingPrice} = €${(row.qty * pr.sellingPrice).toFixed(2)}`);
    }
  }

  console.log(`\n✓ Done — ${WEEKS.length} weeks revised.`);
}

main().catch(console.error).finally(() => p.$disconnect());
