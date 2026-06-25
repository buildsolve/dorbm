const { PrismaClient } = require('./node_modules/.prisma/client');
const fs = require('fs');
const p = new PrismaClient();

// Order matters: parents before children (FK dependency order)
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
  const dump = {};
  for (const model of MODELS) {
    if (!p[model]) { console.log(`  ⚠ skip unknown model: ${model}`); continue; }
    const rows = await p[model].findMany();
    dump[model] = rows;
    console.log(`  ${model}: ${rows.length} rows`);
  }
  fs.writeFileSync('export.json', JSON.stringify(dump, null, 2));
  console.log('\n✓ Exported to export.json');
}

main().catch(console.error).finally(() => p.$disconnect());
