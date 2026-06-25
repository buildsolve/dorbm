const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  // Only target IDLE connections (never 'active' — those are doing real work,
  // possibly production traffic) that have been sitting idle for a while.
  const idle = await p.$queryRawUnsafe(`
    SELECT pid, datname, state, (now() - state_change)::text as idle_for
    FROM pg_stat_activity
    WHERE state = 'idle'
      AND pid <> pg_backend_pid()
      AND now() - state_change > interval '2 minutes'
    ORDER BY state_change ASC
  `);
  console.log(`Found ${idle.length} idle connections older than 2 minutes`);
  for (const row of idle) {
    console.log(`  pid=${row.pid} db=${row.datname} idle_for=${row.idle_for}`);
  }

  if (idle.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  let terminated = 0;
  for (const row of idle) {
    try {
      await p.$executeRawUnsafe(`SELECT pg_terminate_backend(${row.pid})`);
      terminated++;
    } catch (e) {
      console.log(`  failed to terminate pid=${row.pid}: ${e.message}`);
    }
  }
  console.log(`✓ Terminated ${terminated} idle connections`);
}

main().catch(console.error).finally(() => p.$disconnect());
