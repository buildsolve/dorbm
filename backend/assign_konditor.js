const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

// Assignment logic based on specialization from Team notes:
// Konditor 1 (IW) → Torten & Backtage (baking-heavy products, signature cakes)
// Konditor 2 (P)  → Tarts, Theke, Einpacken (tarts, small items, packing)
// Aushilfe        → Sa/So (Saturday only)

// Product code → employee name
const ASSIGNMENTS = {
  // Monday — Frühstück & Croissants
  PRD_BUTTERCROISS_FR:  'Konditor 1 (IW)',   // baking
  PRD_MINISCHOKOCR_FR:  'Konditor 2 (P)',    // smaller items / Theke
  PRD_ZITRONENKUCH_FR:  'Konditor 1 (IW)',   // baking

  // Tuesday — Cake Pops & Signature Torten
  PRD_CAKEPOPS_EXT:     'Konditor 2 (P)',    // assembly / Einpacken
  PRD_ERDBEERTIRA_KCH:  'Konditor 1 (IW)',   // signature Torte
  PRD_HOPEKUCHEN_KCH:   'Konditor 1 (IW)',   // signature Torte

  // Wednesday — Torten & Sacher
  PRD_LIEBEERE_KCH:     'Konditor 1 (IW)',   // Torte
  PRD_SCHOKOHIMB_KCH:   'Konditor 1 (IW)',   // Torte
  PRD_SCHOKOMARCJ_KCH:  'Konditor 2 (P)',    // Vegan Torte / Theke
  PRD_SACHERTORT_EDS:   'Konditor 2 (P)',    // high-volume / assembly

  // Thursday — Cheesecakes & Brot
  PRD_BAKEDCHEES_9Y3:   'Konditor 1 (IW)',   // baking
  PRD_MINICHEESE_NR7:   'Konditor 2 (P)',    // assembly / Theke
  PRD_BANANABREA_83L:   'Konditor 1 (IW)',   // baking

  // Friday — Tarts & Cookies
  PRD_ROSEPISTAZ_TAR:   'Konditor 2 (P)',    // Tarts specialty
  PRD028:               'Konditor 2 (P)',    // Tarts specialty (Mango Coco)
  PRD029:               'Konditor 1 (IW)',   // baking (Vegane Cookies)

  // Saturday — Eis & Kalt
  PRD_KULFIEIS_PED:     'Aushilfe Wochenende',
  PRD_POPSICLES_Z8U:    'Aushilfe Wochenende',
};

async function main() {
  // Load all KW27-31 plans
  const plans = await p.weeklyPlan.findMany({
    where: { year: 2026, weekNumber: { in: [27, 28, 29, 30, 31] } },
    include: { tasks: { include: { product: true } } },
  });

  let total = 0;
  for (const plan of plans) {
    console.log(`\nKW${plan.weekNumber}:`);
    for (const task of plan.tasks) {
      const code = task.product?.code;
      const assignee = ASSIGNMENTS[code];
      if (!assignee) {
        console.log(`  ⚠ No assignment for ${code} (${task.product?.name})`);
        continue;
      }
      await p.weeklyTask.update({ where: { id: task.id }, data: { assignedTo: assignee } });
      console.log(`  ✓ ${task.product?.name.padEnd(35)} → ${assignee}`);
      total++;
    }
  }
  console.log(`\n✓ Assigned ${total} tasks across ${plans.length} plans.`);
}

main().catch(console.error).finally(() => p.$disconnect());
