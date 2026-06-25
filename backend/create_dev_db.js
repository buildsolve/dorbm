const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const dbName = 'cakeerp_dev';
  const exists = await p.$queryRawUnsafe(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
  if (exists.length > 0) {
    console.log(`Database "${dbName}" already exists.`);
    return;
  }
  await p.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
  console.log(`✓ Created database "${dbName}"`);
}

main().catch(console.error).finally(() => p.$disconnect());
