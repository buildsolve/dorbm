const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const cats = await p.productCategory.findMany();
  console.log('=== CATEGORIES ===');
  cats.forEach(c => console.log(c.id + ' | ' + c.name));

  const products = await p.product.findMany({ include: { category: true }, orderBy: { code: 'asc' } });
  console.log('\n=== PRODUCTS ===');
  products.forEach(x => console.log((x.category?.name ?? 'none') + ' | ' + x.code + ' | ' + x.name + (x.isActive ? '' : ' [inactive]')));

  const recipes = await p.recipe.findMany({ select: { name: true } });
  console.log('\n=== RECIPES ===');
  recipes.forEach(r => console.log(r.name));
}

main().catch(console.error).finally(() => p.$disconnect());
