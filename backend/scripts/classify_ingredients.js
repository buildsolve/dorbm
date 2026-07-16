/**
 * One-time script: set category on all existing ingredients that have no category yet,
 * using keyword scoring identical to the old client-side classifier.
 * Run once against dev, then again against prod after deploying the migration.
 */
const { PrismaClient } = require('../node_modules/.prisma/client');
const p = new PrismaClient();

const GROUPS = [
  { name: 'Mehl, Getreide & Backtriebmittel', keywords: [
    'mehl','flour','hafer','stärke','staerke','mondamin','grie','backpulver','baking powder','natron','löffelbisc','boden','tortlett',
  ]},
  { name: 'Milchprodukte & Eier', keywords: [
    'milch','milk','butter','sahne','joghurt','quark','mascarpone','käse','kaese','cheese','schlagcreme','eigelb','eiweiss','vollei','voll ei','egg',
  ], negative: ['kokosmilch','hafermilch','erdnussbutter'] },
  { name: 'Zucker & Süßungsmittel', keywords: [
    'zucker','sugar','glucose','glukose','honig','sirup','erytrit','fondant','icing',
  ]},
  { name: 'Schokolade & Kakao', keywords: [
    'kuvert','schok','kakao','cocoa','nougat','callebaut',
  ]},
  { name: 'Früchte & Gemüse', keywords: [
    'banane','beere','erdbeer','himbeer','blaubeer','heidelbeer','mango','maracuja','passion',
    'limette','zitrone','orange','mandarine','cranberr','datel','früchte','kürbis','karotte',
    'möhren','püree','pueree','pure',
  ], negative: ['kürbiskerne','marzipan'] },
  { name: 'Nüsse, Kokos & Marzipan', keywords: [
    'mandel','haselnuss','pistazie','cashew','erdnuss','kokos','kürbiskerne','marzipan',
  ]},
  { name: 'Fette & Öle', keywords: [
    'margarine','öl','oel','sonnenblumen','raps',
  ]},
  { name: 'Aromen & Gewürze', keywords: [
    'vanill','zimt','salz','matcha','espresso','rosenwasser','bourbon','paste','extract',
  ], negative: ['puddingpulver'] },
  { name: 'Bindemittel & Hilfsstoffe', keywords: [
    'gelatine','agar','pudding','cremepulver','creme pulver','protein','topglanz','saftbinder','geleeguss','wasser','gefrier',
  ]},
];

function classify(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase();
  let best = 'Bindemittel & Hilfsstoffe';
  let bestScore = 0;
  for (const g of GROUPS) {
    let score = 0;
    for (const kw of g.keywords) { if (text.includes(kw)) score += 10; }
    for (const kw of g.negative || []) { if (text.includes(kw)) score -= 20; }
    if (score > bestScore) { bestScore = score; best = g.name; }
  }
  return best;
}

async function main() {
  const all = await p.ingredient.findMany({ where: { category: null } });
  console.log(`Found ${all.length} ingredients without category`);
  let updated = 0;
  for (const ing of all) {
    const category = classify(ing.name, ing.description);
    await p.ingredient.update({ where: { id: ing.id }, data: { category } });
    console.log(`  [${category}] ${ing.name}`);
    updated++;
  }
  console.log(`\n✓ Classified ${updated} ingredients`);
}

main().catch(console.error).finally(() => p.$disconnect());
