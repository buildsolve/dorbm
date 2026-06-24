const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const products = await p.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, code: true, name: true, sellingPrice: true, category: { select: { name: true } } },
  });
  console.log('Active products:');
  products.forEach(pr => console.log(`  ${pr.code.padEnd(28)} €${String(pr.sellingPrice).padStart(6)}  ${pr.name}  [${pr.category?.name ?? 'none'}]`));
  console.log(`\nTotal: ${products.length} active products`);
}
main().catch(console.error).finally(() => p.$disconnect());
