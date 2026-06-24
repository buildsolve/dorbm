const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

// Correct yields for new recipes (seed script had a parameter naming bug → all defaulted to yield=1)
// yieldUnit and labour/baking times are also corrected where needed
const FIXES = [
  // Frühstück — batch items
  { code: 'REC_ZITRONENKUCH_FR',  yield: 8,  yieldUnit: 'Stück',  labourTimeMinutes: 25 }, // 1 loaf → 8 slices
  { code: 'REC_BUTTERCROISS_FR',  yield: 6,  yieldUnit: 'Stück',  labourTimeMinutes: 40 }, // batch of 6
  { code: 'REC_MINISCHOKOCR_FR',  yield: 10, yieldUnit: 'Stück',  labourTimeMinutes: 35 }, // batch of 10

  // Kuchen — whole cakes (yield=1 is correct, labour already reasonable)
  // Hope Kuchen: 60min/1 = 60min/cake ✓
  // Schoko Maracuja: 70min/1 ✓
  // Erdbeer Tiramisu: 60min/1 ✓
  // Liebeere: 55min/1 ✓
  // Schoko-Himbeer: 60min/1 ✓

  // Tarts — batch items
  { code: 'REC_ROSEPISTAZ_TAR',   yield: 6,  yieldUnit: 'Stück',  labourTimeMinutes: 45 }, // batch of 6 tarts

  // Extras — batch items
  { code: 'REC_CAKEPOPS_EXT',     yield: 12, yieldUnit: 'Stück',  labourTimeMinutes: 45 }, // batch of 12
];

async function main() {
  for (const fix of FIXES) {
    const r = await p.recipe.findUnique({ where: { code: fix.code } });
    if (!r) { console.log(`  NOT FOUND: ${fix.code}`); continue; }
    await p.recipe.update({
      where: { code: fix.code },
      data: { yield: fix.yield, yieldUnit: fix.yieldUnit, labourTimeMinutes: fix.labourTimeMinutes },
    });
    console.log(`  ✓ ${fix.code}: yield → ${fix.yield} ${fix.yieldUnit}, labour → ${fix.labourTimeMinutes} min`);
  }
  console.log('\n✓ Yields fixed. Now recalculating estimatedMinutes…');

  // Recalculate estimatedMinutes for all July plans
  const plans = await p.weeklyPlan.findMany({
    where: { year: 2026, weekNumber: { in: [27, 28, 29, 30, 31] } },
    include: {
      tasks: {
        include: {
          product: { include: { recipe: { select: { yield: true, labourTimeMinutes: true } } } },
        },
      },
    },
  });

  let totalMin = 0;
  for (const plan of plans) {
    let weekMin = 0;
    for (const task of plan.tasks) {
      const recipe = task.product?.recipe;
      if (!recipe) continue;
      const recipeYield = Number(recipe.yield) || 1;
      const estimatedMinutes = Math.round((Number(recipe.labourTimeMinutes) / recipeYield) * Number(task.quantity));
      await p.weeklyTask.update({ where: { id: task.id }, data: { estimatedMinutes } });
      weekMin += estimatedMinutes;
    }
    console.log(`  KW${plan.weekNumber}: ${weekMin} min (${(weekMin / 60).toFixed(1)} h)`);
    totalMin += weekMin;
  }

  const teamHoursPerWeek = 78; // 40 + 26 + 12
  const weeklyCapMin = teamHoursPerWeek * 60;
  const avgWeekMin = totalMin / 5;
  console.log(`\n  Avg per week: ${avgWeekMin.toFixed(0)} min (${(avgWeekMin/60).toFixed(1)} h)`);
  console.log(`  Team capacity: ${weeklyCapMin} min (${teamHoursPerWeek} h)`);
  console.log(`  Capacity utilisation: ${(avgWeekMin / weeklyCapMin * 100).toFixed(1)}%`);
  console.log('\n✓ Done.');
}

main().catch(console.error).finally(() => p.$disconnect());
