const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

// Names (or partial name matches) of products that should be ACTIVE
const ACTIVE_NAMES = [
  // Frühstück
  'Bananenbrot',
  'Banana Bread',
  'Zitronen Kuchen',
  'Butter Croissants',
  'Mini Schoko Croissants',
  // Kuchen
  'Baked Cheesecake',
  'Hope Kuchen',
  'Mini Cheesecake',
  'Schoko Maracuja',
  'Erdbeer Tiramisu',
  'Liebeere',
  'Schoko-Himbeer',
  'Rose Pistazien Tarts',
  'Mango Coco Tart',
  'Sacher Torte',
  // Extras
  'Cake Pops',
  'Vegane Cookies',
  'Popsicles',
  'Kulfi',
];

function shouldBeActive(name) {
  return ACTIVE_NAMES.some(n => name.toLowerCase().includes(n.toLowerCase()));
}

async function main() {
  const all = await p.product.findMany({ select: { id: true, name: true, code: true, isActive: true } });

  let activated = 0, deactivated = 0;
  for (const prod of all) {
    const active = shouldBeActive(prod.name);
    if (prod.isActive !== active) {
      await p.product.update({ where: { id: prod.id }, data: { isActive: active } });
      console.log(`  ${active ? '✓ AKTIV  ' : '✗ inaktiv'} ${prod.name}`);
      active ? activated++ : deactivated++;
    } else {
      console.log(`  ${active ? '  aktiv  ' : '  inaktiv'} ${prod.name} (unverändert)`);
    }
  }

  console.log(`\n✓ Fertig — ${activated} aktiviert, ${deactivated} deaktiviert.`);
}

main().catch(console.error).finally(() => p.$disconnect());
