const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  // ── Categories ──────────────────────────────────────────────
  const fruehstueckCat = await p.productCategory.upsert({
    where: { name: 'Frühstück' },
    update: {},
    create: { name: 'Frühstück', description: 'Frühstücksgebäck & Brote' },
  });
  console.log('Category: Frühstück', fruehstueckCat.id);

  const extrasCat = await p.productCategory.upsert({
    where: { name: 'Extras' },
    update: {},
    create: { name: 'Extras', description: 'Kleine Extras & Sonderartikel' },
  });
  console.log('Category: Extras', extrasCat.id);

  const kuchenCat = await p.productCategory.findFirst({ where: { name: 'Kuchen' } });
  const tartsCat  = await p.productCategory.findFirst({ where: { name: 'Tarts & Tortes' } });

  // ── Helper: create recipe + product ─────────────────────────
  async function addItem({ code, name, description, categoryId, price, yield: yld = 1, yieldUnit = 'units', bakingMin = 0, laborMin = 30 }) {
    const existing = await p.product.findUnique({ where: { code } });
    if (existing) {
      console.log(`  SKIP (exists): ${name}`);
      return;
    }

    const recCode = 'REC_' + code.replace('PRD_', '');
    const existingRec = await p.recipe.findUnique({ where: { code: recCode } });
    let recipe;
    if (existingRec) {
      recipe = existingRec;
    } else {
      recipe = await p.recipe.create({
        data: {
          code: recCode,
          name,
          description: description ?? null,
          yield: yld,
          yieldUnit,
          bakingTimeMinutes: bakingMin,
          labourTimeMinutes: laborMin,
          isActive: true,
        },
      });
    }

    await p.product.create({
      data: {
        code,
        name,
        description: description ?? null,
        categoryId,
        recipeId: recipe.id,
        sellingPrice: price,
        isActive: true,
      },
    });
    console.log(`  + ${name} (${code}) @ €${price}`);
  }

  // ── Frühstück ────────────────────────────────────────────────
  console.log('\n--- Frühstück ---');
  // Bananenbrot already exists — skip
  await addItem({ code: 'PRD_ZITRONENKUCH_FR', name: 'Zitronen Kuchen', categoryId: fruehstueckCat.id, price: 5.50, yld: 8, yieldUnit: 'Stück', bakingMin: 45, laborMin: 25 });
  await addItem({ code: 'PRD_BUTTERCROISS_FR', name: 'Butter Croissants', categoryId: fruehstueckCat.id, price: 3.20, yld: 6, yieldUnit: 'Stück', bakingMin: 20, laborMin: 40 });
  await addItem({ code: 'PRD_MINISCHOKOCR_FR', name: 'Mini Schoko Croissants', categoryId: fruehstueckCat.id, price: 2.80, yld: 10, yieldUnit: 'Stück', bakingMin: 18, laborMin: 35 });

  // ── Kuchen ───────────────────────────────────────────────────
  console.log('\n--- Kuchen ---');
  // Baked Cheesecake exists, Mini Cheesecake exists, Mango Coco Tart exists, Sacher Torte exists
  await addItem({ code: 'PRD_HOPEKUCHEN_KCH', name: 'Hope Kuchen', categoryId: kuchenCat?.id, price: 30.00, yld: 1, yieldUnit: 'Torte', bakingMin: 50, laborMin: 60 });
  await addItem({ code: 'PRD_SCHOKOMARCJ_KCH', name: 'Schoko Maracuja (Vegan)', categoryId: kuchenCat?.id, price: 34.00, yld: 1, yieldUnit: 'Torte', bakingMin: 40, laborMin: 70 });
  await addItem({ code: 'PRD_ERDBEERTIRA_KCH', name: 'Erdbeer Tiramisu', categoryId: kuchenCat?.id, price: 32.00, yld: 1, yieldUnit: 'Torte', bakingMin: 0, laborMin: 60 });
  await addItem({ code: 'PRD_LIEBEERE_KCH', name: 'Liebeere', categoryId: kuchenCat?.id, price: 28.00, yld: 1, yieldUnit: 'Torte', bakingMin: 30, laborMin: 55 });
  await addItem({ code: 'PRD_SCHOKOHIMB_KCH', name: 'Schoko-Himbeer', categoryId: kuchenCat?.id, price: 30.00, yld: 1, yieldUnit: 'Torte', bakingMin: 35, laborMin: 60 });
  await addItem({ code: 'PRD_ROSEPISTAZ_TAR', name: 'Rose Pistazien Tarts', categoryId: tartsCat?.id, price: 6.50, yld: 6, yieldUnit: 'Stück', bakingMin: 20, laborMin: 45 });

  // ── Extras ───────────────────────────────────────────────────
  console.log('\n--- Extras ---');
  // Cookies exists, Popsicles exists, Kulfi exists
  await addItem({ code: 'PRD_CAKEPOPS_EXT', name: 'Cake Pops', categoryId: extrasCat.id, price: 3.00, yld: 12, yieldUnit: 'Stück', bakingMin: 0, laborMin: 45 });

  console.log('\n✓ Done.');
}

main().catch(console.error).finally(() => p.$disconnect());
