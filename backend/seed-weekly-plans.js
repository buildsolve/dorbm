// Generates Wochenplanung (WeeklyPlan + WeeklyTask) until end of 2026,
// modeled on the kitchen's real Trello rhythm:
//   MON  heavy bake & prep (cheesecakes 8x, minis, tart bases, cookies, banana bread)
//   TUE  assembly (tiramisu einsetzen, vegan bases, mango tarts fertig)
//   WED  torte assembly (Sacher Böden, Blaubeere/vegan einsetzen, fondant deko)
//   THU  cut & pack day (tiramisu/liebeere schneiden, torte fertig, pudding)
//   FRI  second bake + weekend prep (cheesecakes 8x, hope/opera, cookie bags)
//   SAT  light finishing (rose pistazie tarts fertig, bestellung)
//   SUN  off
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// [productName, day, qty, minutes, assignedTo, note]
const BASE_TEMPLATE = [
  // ---- Montag ----
  ['Cheesecake 26cm',              'MON', 8,  90, 'IW', 'Cheesecake backen 8x'],
  ['Mini Cheesecake',              'MON', 16, 60, 'IW', 'Mini Cheesecake backen'],
  ['Mango Coco Tart',              'MON', 12, 75, 'P',  'Böden backen 2x, Kern machen, Füllung vorbereiten (Pudding)'],
  ['Vegane Cookies',               'MON', 24, 45, 'IW', '2 Blech Cookies & 1 Blech Cookiebombs backen'],
  ['Bananenbrot (Vegan)',          'MON', 6,  40, 'P',  'Bananenbrot backen und einpacken'],
  ['Lemon Raspberry Tart',         'MON', 18, 50, 'P',  'Mürbeteig vorbereiten 18x'],
  // ---- Dienstag ----
  ['Mango Coco Tart',              'TUE', 12, 45, 'P',  'Mango Coco Tarts fertig machen'],
  ['Tiramisu',                     'TUE', 12, 50, 'IW', '1 Blech Erdbeer-Tiramisu einsetzen'],
  ['Kokos Torte (Vegan)',          'TUE', 3,  60, 'IW', 'Vegane Böden backen'],
  ['Sacher Torte',                 'TUE', 4,  50, 'IW', 'Biskuit backen, dunkel'],
  // ---- Mittwoch ----
  ['Blaubeere-Zitrone Torte 26cm', 'WED', 2,  45, 'IW', 'Blaubeere-Zitrone Torte einsetzen'],
  ['Passion Frucht Torte 26cm (Vegan)', 'WED', 2, 50, 'IW', 'Vegane Torte einsetzen, Böden schneiden'],
  ['Sacher Torte',                 'WED', 9,  70, 'IW', 'Sacher Böden 6x 26cm, 3x 18cm'],
  ['Macaron Törtchen',             'WED', 6,  35, 'P',  'Fondant-Deko / Fondant Hut'],
  // ---- Donnerstag ----
  ['Tiramisu',                     'THU', 12, 30, 'P',  '1 Blech Tiramisu schneiden und einpacken'],
  ['Blaubeere Zitrone',            'THU', 12, 30, 'P',  '1 Blech Liebeere schneiden und einpacken'],
  ['Sacher Torte',                 'THU', 4,  60, 'P',  'Torte fertig machen, Böden in den Kühlschrank'],
  ['Himbeer Pistazien',            'THU', 12, 25, 'P',  'Pudding für Rose Pistazie zart aufkochen'],
  ['Kokos Torte (Vegan)',          'THU', 2,  25, 'P',  '1kg vegane Buttercreme aufschlagen'],
  // ---- Freitag ----
  ['Cheesecake 26cm',              'FRI', 8,  90, 'P',  'Cheesecake backen 8x'],
  ['Mini Cheesecake',              'FRI', 16, 60, 'P',  'Mini Cheesecake backen'],
  ['Himbeer Pistazien',            'FRI', 12, 35, 'P',  'Rose Pistazie Tarts mit Pudding umfüllen'],
  ['Hafer Cranberry Cookies',      'FRI', 12, 30, 'P',  'Cookie Bags vorbereiten 6x, Cookies portionieren'],
  ['Sacher Torte',                 'FRI', 3,  45, 'IW', 'Dunkle Böden backen'],
  ['Opera Torte',                  'FRI', 2,  60, 'IW', 'Hope Torte einsetzen, Hope Böden backen'],
  // ---- Samstag ----
  ['Himbeer Pistazien',            'SAT', 12, 30, 'P',  'Rose Pistazie Tarts fertig machen'],
];

// Seasonal extras by calendar week
function seasonal(kw) {
  const extra = [];
  if (kw <= 35) {
    // summer: frozen desserts
    extra.push(['Eis Cups',  'MON', 12, 30, 'IW', 'Eis Cups vorbereiten und einfrieren']);
    extra.push(['Popsicles', 'FRI', 12, 25, 'P',  'Popsicles gießen und einfrieren']);
  } else if (kw <= 47) {
    // autumn: pumpkin season
    extra.push(['Pumkin Orange',   'WED', 2, 45, 'IW', 'Pumpkin-Orange Torte einsetzen (Herbstsaison)']);
    extra.push(['Karottenkuchen',  'TUE', 2, 50, 'P',  'Karottenkuchen backen (Herbstsaison)']);
  } else {
    // christmas season: gifting & extra cookies
    extra.push(['Mini Bento Schokopistazie', 'WED', 6,  40, 'IW', 'Mini Bento Cakes (Weihnachtsgeschäft)']);
    extra.push(['Hafer Cranberry Cookies',   'MON', 24, 45, 'P',  'Doppelte Menge Cookieteig vorbereiten (Weihnachtsgeschäft)']);
    extra.push(['Cupcakes',                  'FRI', 12, 35, 'P',  'Cupcakes mit Winterdeko (Weihnachtsgeschäft)']);
  }
  return extra;
}

async function main() {
  const products = await p.product.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const byName = new Map();
  for (const pr of products) if (!byName.has(pr.name)) byName.set(pr.name, pr.id);

  // Mondays from 2026-06-08 (KW 24, current week) through end of 2026
  const jan1 = new Date(2026, 0, 1);
  const kwOf = (monday) => Math.ceil(((monday.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);

  let created = 0, skipped = 0, missing = new Set();
  for (let monday = new Date(2026, 5, 8); monday.getFullYear() === 2026; monday = new Date(monday.getTime() + 7 * 86400000)) {
    const kw = kwOf(monday);

    let plan = await p.weeklyPlan.findUnique({
      where: { year_weekNumber: { year: 2026, weekNumber: kw } },
      include: { tasks: { select: { id: true } } },
    });
    if (plan && plan.tasks.length > 0) { console.log(`KW ${kw}: has ${plan.tasks.length} tasks — skipped`); skipped++; continue; }
    if (!plan) {
      plan = await p.weeklyPlan.create({
        data: { year: 2026, weekNumber: kw, weekStart: monday, status: 'DRAFT', notes: 'Auto-generiert nach Küchen-Wochenrhythmus (Trello)' },
        include: { tasks: { select: { id: true } } },
      });
    }

    const template = [...BASE_TEMPLATE, ...seasonal(kw)];
    let sort = 0;
    for (const [name, day, qty, mins, who, note] of template) {
      const productId = byName.get(name);
      if (!productId) { missing.add(name); continue; }
      await p.weeklyTask.create({
        data: {
          weeklyPlanId: plan.id, productId, plannedDay: day,
          quantity: qty, estimatedMinutes: mins, assignedTo: who,
          status: 'PLANNED', notes: note, sortOrder: sort++,
        },
      });
    }
    console.log(`KW ${kw} (${monday.toISOString().slice(0, 10)}): ${sort} tasks created`);
    created++;
  }
  if (missing.size) console.log('⚠ Products not found:', [...missing].join(', '));
  console.log(`\n✅ ${created} weeks filled, ${skipped} weeks skipped (already planned)`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
