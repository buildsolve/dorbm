const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Industry defaults matching frontend DEFAULT_POWER_KW
const DEFAULT_POWER = {
  OFEN:         { GROSS: 18.0, MITTEL: 11.0, KLEIN: 5.5,  _: 11.0 },
  TIEFKUEHLER:  { GROSS: 1.5,  MITTEL: 0.9,  KLEIN: 0.35, _: 0.9  },
  KUEHLSCHRANK: { GROSS: 0.8,  MITTEL: 0.5,  KLEIN: 0.2,  _: 0.5  },
  MIXER:        { GROSS: 5.0,  MITTEL: 1.5,  KLEIN: 0.55, _: 1.5  },
  SONSTIGES:    { GROSS: 3.0,  MITTEL: 1.5,  KLEIN: 0.75, _: 1.5  },
};

async function main() {
  const devices = await p.equipment.findMany();
  console.log('Current devices:');
  devices.forEach(d => console.log(`  ${d.name} (${d.type}/${d.size ?? '-'}) powerKw=${d.powerKw}`));

  const toUpdate = devices.filter(d => d.powerKw == null);
  console.log(`\nBackfilling ${toUpdate.length} devices with null powerKw...`);

  for (const d of toUpdate) {
    const row = DEFAULT_POWER[d.type] || DEFAULT_POWER.SONSTIGES;
    const kw = d.size && row[d.size] != null ? row[d.size] : row['_'];
    await p.equipment.update({ where: { id: d.id }, data: { powerKw: kw } });
    console.log(`  Updated ${d.name} → ${kw} kW`);
  }

  console.log('\nDone.');
}

main().finally(() => p.$disconnect());
