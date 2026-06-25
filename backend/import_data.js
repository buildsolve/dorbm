const { PrismaClient } = require('./node_modules/.prisma/client');
const fs = require('fs');
const p = new PrismaClient();

// Same order as export: parents before children
const MODELS = [
  'user', 'employee', 'supplier', 'ingredient', 'stockTransaction',
  'recipe', 'recipeStage', 'recipeComponent', 'recipeVersion',
  'productCategory', 'product',
  'productionPlan', 'productionPlanLine', 'productionBatch', 'ingredientUsage',
  'weeklyPlan', 'weeklyTask',
  'storageLocation', 'storageRecord', 'storageMovement',
  'essoCostModel', 'essoCostTier', 'essoCapacity', 'essoScenario', 'essoResult',
  'businessJournalEntry', 'equipment', 'buildingCost',
];

async function main() {
  const dump = JSON.parse(fs.readFileSync('export.json', 'utf8'));

  console.log('Clearing existing (seed) data...');
  for (const model of [...MODELS].reverse()) {
    if (!p[model]) continue;
    await p[model].deleteMany({});
  }
  console.log('✓ Cleared\n');

  console.log('Importing real data...');
  for (const model of MODELS) {
    const rows = dump[model] ?? [];
    if (rows.length === 0) { console.log(`  ${model}: 0 rows (skip)`); continue; }
    const result = await p[model].createMany({ data: rows });
    console.log(`  ${model}: ${result.count} rows imported`);
  }
  console.log('\n✓ Import complete');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
