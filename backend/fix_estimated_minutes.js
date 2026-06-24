const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  // Get all tasks for KW25-31 with their product + recipe
  const plans = await p.weeklyPlan.findMany({
    where: { year: 2026 },
    include: {
      tasks: {
        include: {
          product: {
            include: { recipe: { select: { yield: true, labourTimeMinutes: true, bakingTimeMinutes: true } } },
          },
        },
      },
    },
  });

  let updated = 0;
  for (const plan of plans) {
    for (const task of plan.tasks) {
      const recipe = task.product?.recipe;
      if (!recipe) continue;
      const recipeYield = Number(recipe.yield) || 1;
      const labourPerUnit = Number(recipe.labourTimeMinutes) / recipeYield;
      const estimatedMinutes = Math.round(labourPerUnit * Number(task.quantity));
      if (estimatedMinutes === Number(task.estimatedMinutes)) continue;
      await p.weeklyTask.update({ where: { id: task.id }, data: { estimatedMinutes } });
      console.log(`KW${plan.weekNumber} ${task.product?.name.padEnd(35)} qty:${task.quantity} recipe:${recipe.labourTimeMinutes}min/yield:${recipeYield} → ${estimatedMinutes} min`);
      updated++;
    }
  }
  console.log(`\n✓ Updated ${updated} tasks.`);
}

main().catch(console.error).finally(() => p.$disconnect());
