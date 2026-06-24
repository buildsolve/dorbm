// Rescales the Wochenplanung so planned revenue hits €16k–20k per month
// (~€4,400/week). One task per product per week (production stages folded
// into the note) to avoid double-counting revenue. Keeps the kitchen's
// Trello rhythm: Mon/Fri bake days, Tue/Wed assembly, Thu cut & pack, Sat light.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// [productName, day, qty, minutes, assignedTo, note]   (≈ €4,373 base/week)
const BASE = [
  // ---- Montag: großer Backtag (≈ €979) ----
  ['Cheesecake 26cm',              'MON', 12, 130, 'IW', 'Cheesecake backen 12x (Wasserbad), abkühlen, kühlen'],
  ['New York Cheesecake (9")',     'MON', 6,  80,  'IW', 'NY Cheesecake backen 6x'],
  ['Mini Cheesecake',              'MON', 30, 90,  'P',  'Mini Cheesecakes backen 30x'],
  ['Bananenbrot (Vegan)',          'MON', 10, 60,  'P',  'Bananenbrot backen 10x und einpacken'],
  ['Vegane Cookies',               'MON', 36, 60,  'P',  '3 Blech Cookies & Cookiebombs backen, portionieren'],
  // ---- Dienstag: Assembly (≈ €594) ----
  ['Mango Coco Tart',              'TUE', 24, 90,  'P',  'Böden backen, Kern machen, Füllung (Pudding), fertig machen'],
  ['Tiramisu',                     'TUE', 24, 75,  'IW', '2 Blech Erdbeer-Tiramisu einsetzen, Do schneiden & einpacken'],
  ['Kokos Torte (Vegan)',          'TUE', 5,  90,  'IW', 'Vegane Böden backen, Buttercreme, einsetzen'],
  ['Matcha Rolle',                 'TUE', 18, 60,  'P',  'Matcha Rollen backen, füllen, rollen'],
  // ---- Mittwoch: Tortentag (≈ €733) ----
  ['Passion Frucht Torte 26cm (Vegan)', 'WED', 4, 80, 'IW', 'Vegane Torte einsetzen, Böden schneiden'],
  ['Blaubeere-Zitrone Torte 26cm', 'WED', 4,  75,  'IW', 'Blaubeere-Zitrone Torten einsetzen'],
  ['Chocolate Fudge Cake (8")',    'WED', 4,  70,  'IW', 'Fudge Cakes backen und einstreichen'],
  ['Classic Vanilla Cake (8")',    'WED', 4,  70,  'P',  'Vanilla Cakes backen, füllen, einstreichen'],
  ['Macaron Törtchen',             'WED', 12, 60,  'P',  'Macaron Törtchen, Fondant-Deko / Fondant Hut'],
  ['Sacher Torte',                 'WED', 24, 110, 'IW', 'Sacher Böden 6x26/3x18, Marmelade, Guss, fertig machen'],
  // ---- Donnerstag: Schneiden & Einpacken + Törtchen (≈ €630) ----
  ['Joghurt Törtchen',             'THU', 18, 60,  'P',  'Joghurt Törtchen produzieren'],
  ['Royal Raspberry Schnittchen',  'THU', 24, 70,  'P',  'Royal Raspberry einsetzen, schneiden, einpacken'],
  ['Purple Velvet',                'THU', 12, 45,  'IW', 'Purple Velvet Schnitten'],
  ['Sommer Trio',                  'THU', 12, 45,  'IW', 'Sommer Trio Schnitten'],
  ['Blaubeere Zitrone',            'THU', 24, 50,  'P',  '2 Blech Liebeere schneiden und einpacken'],
  ['Lemon Raspberry Tart',         'THU', 18, 70,  'P',  'Mürbeteig 18x, blind backen, füllen'],
  // ---- Freitag: 2. Backtag + Wochenend-Prep (≈ €1.143) ----
  ['Cheesecake 26cm',              'FRI', 12, 130, 'P',  'Cheesecake backen 12x fürs Wochenende'],
  ['Mini Cheesecake',              'FRI', 30, 90,  'P',  'Mini Cheesecakes backen 30x'],
  ['Hafer Cranberry Cookies',      'FRI', 24, 50,  'P',  'Cookie Bags vorbereiten, Cookies portionieren'],
  ['Opera Torte',                  'FRI', 18, 80,  'IW', 'Hope/Opera: Böden backen, einsetzen, schneiden'],
  ['Kastenkuchen Zitrone',         'FRI', 8,  60,  'IW', 'Zitronen-Kastenkuchen backen 8x, glasieren'],
  ['Vanilla Cupcakes (Dozen)',     'FRI', 8,  70,  'P',  '8 Dutzend Cupcakes backen und spritzen'],
  ['Karottenkuchen',               'FRI', 4,  60,  'IW', 'Karottenkuchen backen, Frosting, Marzipan-Karotten'],
  // ---- Samstag: leicht (≈ €294) ----
  ['Himbeer Pistazien',            'SAT', 24, 60,  'P',  'Rose Pistazie Tarts: Pudding, umfüllen, fertig machen'],
  ['Kokos Rafaello Vegan MF',      'SAT', 18, 45,  'P',  'Kokos Rafaello fertigstellen'],
  ['Almond Raspberry Vegan',       'SAT', 12, 40,  'IW', 'Almond Raspberry vegan fertig machen'],
];

// Demand factor by calendar week — typical German patisserie sales pattern.
// Base week ≈ €4.487 → monthly revenue stays inside the €16–20k corridor.
const CALIBRATION = 0.93; // keeps every calendar month inside €16–20k (Christmas peak ≈ €20–21k)
function seasonFactor(kw) {
  return CALIBRATION * rawSeasonFactor(kw);
}
function rawSeasonFactor(kw) {
  if (kw <= 26) return 1.0;   // Juni: Normalniveau, Hochzeitssaison
  if (kw <= 31) return 0.9;   // Juli: Sommerloch, Urlaubszeit
  if (kw <= 35) return 0.88;  // August: Tiefpunkt, Hitze drückt Tortenverkauf
  if (kw <= 39) return 1.0;   // September: Rückkehr aus dem Urlaub
  if (kw <= 43) return 1.05;  // Oktober: Herbstgeschäft zieht an
  if (kw <= 47) return 1.1;   // November: Vorweihnachtsgeschäft beginnt
  if (kw === 48) return 1.15; // 1. Advent
  if (kw === 49) return 1.2;  // 2. Advent
  if (kw === 50) return 1.25; // 3. Advent
  if (kw === 51) return 1.3;  // 4. Advent
  if (kw === 52) return 1.35; // Weihnachtswoche: Jahresspitze
  return 0.6;                 // KW 53: zwischen den Jahren
}

function seasonal(kw) {
  if (kw <= 35) return [ // Sommer (+ ≈ €158)
    ['Eis Cups',          'MON', 18, 35, 'IW', 'Eis Cups vorbereiten und einfrieren (Sommer)'],
    ['Popsicles',         'FRI', 18, 30, 'P',  'Popsicles gießen und einfrieren (Sommer)'],
  ];
  if (kw <= 47) return [ // Herbst (+ ≈ €217)
    ['Karotten Kuchen',   'TUE', 24, 55, 'P',  'Karottenkuchen-Schnitten (Herbstsaison)'],
    ['Skinny Cheesecake', 'THU', 18, 50, 'IW', 'Skinny Cheesecake (Herbstsaison)'],
  ];
  return [ // Weihnachten (+ ≈ €212)
    ['Tulpen Cupcakes',          'WED', 12, 45, 'P',  'Deko-Cupcakes Winteredition (Weihnachtsgeschäft)'],
    ['Hafer Cranberry Cookies',  'MON', 24, 45, 'P',  'Doppelte Menge Cookieteig — Weihnachts-Cookieboxen'],
  ];
}

async function main() {
  const products = await p.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sellingPrice: true } });
  const byName = new Map();
  for (const pr of products) if (!byName.has(pr.name)) byName.set(pr.name, pr);

  const plans = await p.weeklyPlan.findMany({
    where: { year: 2026, weekNumber: { gte: 24 } },
    include: { tasks: { select: { id: true } } },
    orderBy: { weekNumber: 'asc' },
  });

  let totalRevenue = 0, weekCount = 0;
  for (const plan of plans) {
    // wipe and refill every planning week with the scaled template
    await p.weeklyTask.deleteMany({ where: { weeklyPlanId: plan.id } });

    const factor = seasonFactor(plan.weekNumber);
    const template = [...BASE, ...seasonal(plan.weekNumber)];
    let sort = 0, weekRevenue = 0;
    for (const [name, day, qty, mins, who, note] of template) {
      const prod = byName.get(name);
      if (!prod) { console.log('⚠ missing product:', name); continue; }
      const scaledQty = Math.max(1, Math.round(qty * factor));
      const scaledMins = Math.max(15, Math.round(mins * factor / 5) * 5);
      await p.weeklyTask.create({
        data: {
          weeklyPlanId: plan.id, productId: prod.id, plannedDay: day,
          quantity: scaledQty, estimatedMinutes: scaledMins, assignedTo: who,
          status: 'PLANNED', notes: note, sortOrder: sort++,
        },
      });
      weekRevenue += scaledQty * Number(prod.sellingPrice);
    }
    await p.weeklyPlan.update({
      where: { id: plan.id },
      data: { notes: `Saisonfaktor ${factor.toFixed(2)} · Zielumsatz 16–20k/Monat — Rhythmus nach Küchen-Trello` },
    });
    totalRevenue += weekRevenue;
    weekCount++;
    console.log(`KW ${plan.weekNumber}: ${sort} tasks, geplanter Umsatz €${weekRevenue.toFixed(0)}`);
  }
  console.log(`\n✅ ${weekCount} Wochen · Ø €${(totalRevenue / weekCount).toFixed(0)}/Woche · ≈ €${((totalRevenue / weekCount) * 4.33 / 1000).toFixed(1)}k/Monat`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
