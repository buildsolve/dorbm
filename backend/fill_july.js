const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// July 2026: weeks 27-31
// KW27 starts Mon Jun 29, KW28 Jul 6, KW29 Jul 13, KW30 Jul 20, KW31 Jul 27
const WEEKS = [
  { weekNumber: 27, weekStart: new Date('2026-06-29') },
  { weekNumber: 28, weekStart: new Date('2026-07-06') },
  { weekNumber: 29, weekStart: new Date('2026-07-13') },
  { weekNumber: 30, weekStart: new Date('2026-07-20') },
  { weekNumber: 31, weekStart: new Date('2026-07-27') },
];

// Realistic weekly product mix — prices verified from DB above
// Target: €17,000 / 5 weeks = €3,400/week
// Mix chosen for a summer cake bakery
const MIX = [
  { code: 'PRD004', qty: 15, price: 35,   day: 'MONDAY' },    // New York Cheesecake     → €525
  { code: 'PRD020', qty: 10, price: 38,   day: 'TUESDAY' },   // Passion Frucht Torte    → €380
  { code: 'PRD022', qty: 10, price: 34,   day: 'TUESDAY' },   // Blaubeere-Zitrone       → €340
  { code: 'PRD002', qty: 12, price: 32,   day: 'WEDNESDAY' }, // Chocolate Fudge         → €384
  { code: 'PRD001', qty: 12, price: 28,   day: 'WEDNESDAY' }, // Classic Vanilla         → €336
  { code: 'PRD003', qty: 50, price: 18,   day: 'THURSDAY' },  // Vanilla Cupcakes        → €900
  { code: 'PRD024', qty: 10, price: 18,   day: 'THURSDAY' },  // Kastenkuchen Zitrone    → €180
  { code: 'PRD030', qty:  8, price: 28,   day: 'FRIDAY' },    // Karottenkuchen          → €224
  { code: 'PRD_BAKEDCHEES_9Y3', qty: 28, price: 4.9, day: 'FRIDAY' }, // Baked Cheesecake → €137.2
  { code: 'PRD_MATCHAROLL_5KY', qty: 16, price: 6.4, day: 'SATURDAY' }, // Matcha Rolle  → €102.4
];
// Per-week revenue: 525+380+340+384+336+900+180+224+137.2+102.4 = 3508.6 ... adjust below

async function main() {
  const products = await p.product.findMany({ where: { isActive: true } });
  const byCode = {};
  products.forEach(pr => { byCode[pr.code] = pr; });

  // Compute per-week revenue and adjust to hit exactly €17,000
  const TARGET = 17000;
  const WEEKS_COUNT = WEEKS.length; // 5
  const perWeekTarget = TARGET / WEEKS_COUNT; // 3400

  let baseRevenue = MIX.reduce((s, r) => s + r.qty * r.price, 0);
  console.log(`Base revenue per week: €${baseRevenue.toFixed(2)}`);

  // Adjust vanilla cupcakes quantity to fill the gap
  const cupcakesIdx = MIX.findIndex(r => r.code === 'PRD003');
  const cupcakePrice = MIX[cupcakesIdx].price;
  const gap = perWeekTarget - baseRevenue;
  const extraCupcakes = Math.round(gap / cupcakePrice);
  MIX[cupcakesIdx].qty += extraCupcakes;
  baseRevenue = MIX.reduce((s, r) => s + r.qty * r.price, 0);
  console.log(`Adjusted cupcakes by ${extraCupcakes} → revenue per week: €${baseRevenue.toFixed(2)}`);
  console.log(`Total July revenue: €${(baseRevenue * WEEKS_COUNT).toFixed(2)}`);

  // Verify all product codes exist
  for (const row of MIX) {
    if (!byCode[row.code]) {
      console.error(`ERROR: product code ${row.code} not found!`);
      process.exit(1);
    }
  }

  // Create weekly plans + tasks
  for (const week of WEEKS) {
    const plan = await p.weeklyPlan.create({
      data: {
        year: 2026,
        weekNumber: week.weekNumber,
        weekStart: week.weekStart,
        status: 'DRAFT',
        notes: `Juli-Plan KW${week.weekNumber} — Ziel €${perWeekTarget.toFixed(0)}/Woche`,
      },
    });
    console.log(`\nCreated KW${week.weekNumber} plan (${plan.id})`);

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
      console.log(`  + ${pr.name.padEnd(35)} ${String(row.qty).padStart(3)} Stk × €${pr.sellingPrice} = €${(row.qty * pr.sellingPrice).toFixed(2)}`);
    }
  }

  console.log(`\n✓ Done — ${WEEKS.length} weeks created.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
