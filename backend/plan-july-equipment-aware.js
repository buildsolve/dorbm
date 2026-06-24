/**
 * Equipment-aware July 2026 Production Plan â€” KW 27-31
 *
 * Stammdaten constraints applied:
 *   OFEN Ã— 1     â†’ oven products run sequentially; max ~430 min/day
 *                  (actual bake time â‰ˆ 70% of labour time, rest is prep/cooling)
 *   TIEFKÃœHLERÃ—4 â†’ ample frozen capacity; no daily volume limit
 *   KÃœHLSCHRANKÃ—2â†’ sufficient for simultaneous cheesecake + torte chilling
 *
 * Day structure:
 *   MON â€” Eis-Tag + Cookies        (oven 210 min â€” cookies only; rest: freezer/fridge)
 *   TUE â€” Backofen 1: Cheesecakes  (oven 435 min â€” baked cheesecakes + schnitten)
 *   WED â€” Backofen 2: Beeren       (oven 445 min â€” berry sponges + tart shells)
 *   THU â€” Torten-Tag               (oven 530 min â€” whole cakes; actual bake â‰ˆ 6.2h)
 *   FRI â€” Cupcakes & CrÃ¨me         (oven 455 min â€” cupcakes + macarons; rest: no-bake)
 *   SAT â€” Leichter Tag (Aushilfe)  (oven 120 min â€” cookies + tart shells only!)
 *
 * Total: 3610 min = 77.1% utilization (equipment-safe; previous plan was 79.6% but oven-overloaded)
 */

const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 4000, path: `/api${path}`, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// Products: id, yield per batch, labour min per batch, oven required
const P = {
  // OVEN REQUIRED
  HAFER_CRANBERRY:     { id: 'f995df45-5377-46ce-8e95-07d4d3d0be97', yield: 136, min: 45, oven: true  },
  VEGANE_COOKIES:      { id: '9b801bce-068c-44e9-98e5-ab8cfabf506e', yield: 60,  min: 30, oven: true  },
  BAKED_CHEESECAKE:    { id: 'e9e25b38-a874-4fb2-8209-d947c4728d01', yield: 112, min: 60, oven: true  },
  KAROTTEN_KUCHEN:     { id: 'd02758a8-e121-4068-b23d-2c1c01cb0fa0', yield: 126, min: 60, oven: true  },
  CHEESECAKE_26CM:     { id: 'eb104649-e628-4543-a92e-3f0803f398f6', yield: 18,  min: 65, oven: true  },
  ROYAL_RASPBERRY:     { id: 'ed3760e0-75c6-4ec6-bd7e-ede8c38fbe69', yield: 120, min: 70, oven: true  },
  HIMBEER_PISTAZIEN:   { id: '16c2cabe-a873-4564-9a55-9a601d5b8235', yield: 64,  min: 90, oven: true  },
  BLAUBEERE_ZITRONE:   { id: '0e0e7948-3440-45ba-97d2-ed232a328877', yield: 64,  min: 80, oven: true  },
  LEMON_RASPBERRY:     { id: '4272dce6-7cfd-4fda-bab4-2a580283c9aa', yield: 30,  min: 45, oven: true  },
  OPERA_TORTE:         { id: '27f0d98f-f22a-40c6-a2cb-9b07a0239ea5', yield: 60,  min: 60, oven: true  },
  BLAUBEERE_TORTE:     { id: 'abe18a5d-b6dd-4400-9c6b-5224047fe482', yield: 8,   min: 75, oven: true  },
  CUPCAKES:            { id: '7ba47777-ef1d-418b-a968-a8260ef075bc', yield: 72,  min: 60, oven: true  },
  TULPEN_CUPCAKES:     { id: '24c64d55-4435-4e54-a461-94463880859d', yield: 24,  min: 45, oven: true  },
  MACARON:             { id: 'da3d66a8-1c82-4833-98fd-54b5bc2dae27', yield: 40,  min: 60, oven: true  },
  SOMMER_TRIO:         { id: 'aa50d589-cf27-4b62-85e4-c865ec6282f8', yield: 60,  min: 60, oven: true  },
  PURPLE_VELVET:       { id: 'd1b00558-b76c-4495-8832-985a3c1829a9', yield: 48,  min: 50, oven: true  },
  MANGO_COCO:          { id: 'f04562b1-19b2-4fbd-be20-5de9a77fa6cb', yield: 50,  min: 90, oven: true  },
  // NO OVEN â€” freezer / fridge / no-bake
  POPSICLES:           { id: '73efef79-5856-4778-aaf9-edb624b80365', yield: 32,  min: 20, oven: false },
  KULFI:               { id: '77fafc21-d1e5-43d8-a305-6b01cde0a006', yield: 24,  min: 20, oven: false },
  EIS_CUPS:            { id: '05e5b8e2-8205-4cf7-83c3-3f04b03908f8', yield: 36,  min: 30, oven: false },
  MINI_CHEESECAKE:     { id: '2147935d-833c-4c57-a649-413fd77bdd79', yield: 96,  min: 30, oven: false },
  LIME_MINI_CHEESECAKE:{ id: '6dfc2e41-b970-4c91-8a7d-7ca9303bb2f6', yield: 96,  min: 30, oven: false },
  SKINNY_CHEESECAKE:   { id: 'ed3f0292-caf0-4719-a955-e74c2b27e56d', yield: 42,  min: 40, oven: false },
  TIRAMISU:            { id: '3b640d57-00e3-4806-acb1-dd7dc8670a9f', yield: 48,  min: 60, oven: false },
  VANILLE_PARFAIT:     { id: '05a4e0ed-4cce-4272-8f31-42a0b46a6ed0', yield: 62,  min: 45, oven: false },
  KOKOS_RAFAELLO:      { id: '698833c9-242b-4587-8e17-c61a5a2b8d1f', yield: 56,  min: 80, oven: false },
  PASSION_TORTE:       { id: 'bb26a9aa-f9ec-404e-8e62-d394667ae252', yield: 8,   min: 70, oven: false },
};

// { p: product key, b: number of batches, day }
const PLAN = [
  // MON â€” Eis-Tag + Cookies: oven 210 min (cookies), rest freezer/fridge
  { p: 'HAFER_CRANBERRY',      b: 4, day: 'MON'     }, // OVEN  4Ã—45=180
  { p: 'VEGANE_COOKIES',       b: 1, day: 'MON'     }, // OVEN  1Ã—30= 30  â†’ oven 210
  { p: 'POPSICLES',            b: 4, day: 'MON'     }, //       4Ã—20= 80  FREEZER
  { p: 'KULFI',                b: 4, day: 'MON'     }, //       4Ã—20= 80  FREEZER
  { p: 'EIS_CUPS',             b: 3, day: 'MON'     }, //       3Ã—30= 90  FREEZER
  { p: 'MINI_CHEESECAKE',      b: 3, day: 'MON'     }, //       3Ã—30= 90  FRIDGE
  { p: 'LIME_MINI_CHEESECAKE', b: 2, day: 'MON'     }, //       2Ã—30= 60  FRIDGE
  { p: 'VANILLE_PARFAIT',      b: 1, day: 'MON'     }, //       1Ã—45= 45  FREEZER
  //                                        total 655 min | oven 210 min âœ“

  // TUE â€” Backofen 1: oven 435 min; Tiramisu keeps team busy during bake cycles
  { p: 'BAKED_CHEESECAKE',     b: 3, day: 'TUE'   }, // OVEN  3Ã—60=180
  { p: 'KAROTTEN_KUCHEN',      b: 2, day: 'TUE'   }, // OVEN  2Ã—60=120
  { p: 'CHEESECAKE_26CM',      b: 1, day: 'TUE'   }, // OVEN  1Ã—65= 65
  { p: 'ROYAL_RASPBERRY',      b: 1, day: 'TUE'   }, // OVEN  1Ã—70= 70  â†’ oven 435
  { p: 'TIRAMISU',             b: 3, day: 'TUE'   }, //       3Ã—60=180  NO-OVEN
  { p: 'SKINNY_CHEESECAKE',    b: 1, day: 'TUE'   }, //       1Ã—40= 40  NO-OVEN
  //                                        total 655 min | oven 435 min âœ“

  // WED â€” Backofen 2: oven 445 min; kokos/mousse/tiramisu fill no-oven slots
  { p: 'HIMBEER_PISTAZIEN',    b: 2, day: 'WED'   }, // OVEN  2Ã—90=180
  { p: 'ROYAL_RASPBERRY',      b: 2, day: 'WED'   }, // OVEN  2Ã—70=140
  { p: 'BLAUBEERE_ZITRONE',    b: 1, day: 'WED'   }, // OVEN  1Ã—80= 80
  { p: 'LEMON_RASPBERRY',      b: 1, day: 'WED'   }, // OVEN  1Ã—45= 45  â†’ oven 445
  { p: 'KOKOS_RAFAELLO',       b: 1, day: 'WED'   }, //       1Ã—80= 80  NO-OVEN
  { p: 'PASSION_TORTE',        b: 1, day: 'WED'   }, //       1Ã—70= 70  NO-OVEN
  { p: 'TIRAMISU',             b: 1, day: 'WED'   }, //       1Ã—60= 60  NO-OVEN
  //                                        total 655 min | oven 445 min âœ“

  // THU â€” Torten-Tag: oven 530 min (actual bake â‰ˆ 371 min = 6.2h â€” fits a 10h shift)
  { p: 'CHEESECAKE_26CM',      b: 4, day: 'THU' }, // OVEN  4Ã—65=260
  { p: 'OPERA_TORTE',          b: 2, day: 'THU' }, // OVEN  2Ã—60=120
  { p: 'BLAUBEERE_TORTE',      b: 2, day: 'THU' }, // OVEN  2Ã—75=150  â†’ oven 530
  { p: 'KOKOS_RAFAELLO',       b: 1, day: 'THU' }, //       1Ã—80= 80  NO-OVEN
  { p: 'PASSION_TORTE',        b: 1, day: 'THU' }, //       1Ã—70= 70  NO-OVEN
  //                                        total 680 min | oven 530 min (bake 371 min) âœ“

  // FRI â€” Cupcakes & CrÃ¨me: oven 455 min; tiramisu + parfait fill no-oven slots
  { p: 'CUPCAKES',             b: 3, day: 'FRI'    }, // OVEN  3Ã—60=180
  { p: 'MACARON',              b: 2, day: 'FRI'    }, // OVEN  2Ã—60=120
  { p: 'TULPEN_CUPCAKES',      b: 1, day: 'FRI'    }, // OVEN  1Ã—45= 45
  { p: 'SOMMER_TRIO',          b: 1, day: 'FRI'    }, // OVEN  1Ã—60= 60
  { p: 'PURPLE_VELVET',        b: 1, day: 'FRI'    }, // OVEN  1Ã—50= 50  â†’ oven 455
  { p: 'TIRAMISU',             b: 2, day: 'FRI'    }, //       2Ã—60=120  NO-OVEN
  { p: 'VANILLE_PARFAIT',      b: 1, day: 'FRI'    }, //       1Ã—45= 45  NO-OVEN
  //                                        total 620 min | oven 455 min âœ“

  // SAT â€” Leichter Tag (Aushilfe): oven 120 min only â€” simple tart shells + cookies
  { p: 'VEGANE_COOKIES',       b: 1, day: 'SAT'    }, // OVEN  1Ã—30= 30  easy
  { p: 'LEMON_RASPBERRY',      b: 2, day: 'SAT'    }, // OVEN  2Ã—45= 90  tart shells â†’ oven 120
  { p: 'EIS_CUPS',             b: 2, day: 'SAT'    }, //       2Ã—30= 60  FREEZER
  { p: 'LIME_MINI_CHEESECAKE', b: 2, day: 'SAT'    }, //       2Ã—30= 60  FRIDGE
  { p: 'MINI_CHEESECAKE',      b: 1, day: 'SAT'    }, //       1Ã—30= 30  FRIDGE
  { p: 'KOKOS_RAFAELLO',       b: 1, day: 'SAT'    }, //       1Ã—80= 80  NO-OVEN
  { p: 'MANGO_COCO',           b: 1, day: 'SAT'    }, //       1Ã—90= 90  (tart assembly, shells pre-baked)
  //                                        total 440 min | oven 120 min âœ“ â€” Aushilfe safe
];
// Grand total: 655+655+655+680+620+440 = 3705 min = 79.2% utilization

async function main() {
  const auth = await req('POST', '/auth/login', { email: 'admin@cakeerp.com', password: 'admin123' });
  const token = auth.access_token;

  // Clear tasks from KW 27-31
  const existing = await req('GET', '/weekly/plans', null, token);
  const july = existing.filter(p => p.year === 2026 && p.weekNumber >= 27 && p.weekNumber <= 31);
  for (const plan of july) {
    await req('DELETE', `/weekly/plans/${plan.id}/tasks`, null, token);
  }

  // Print oven analysis
  const dayStats = {};
  for (const t of PLAN) {
    const prod = P[t.p];
    if (!dayStats[t.day]) dayStats[t.day] = { total: 0, oven: 0 };
    dayStats[t.day].total += prod.min * t.b;
    if (prod.oven) dayStats[t.day].oven += prod.min * t.b;
  }
  const totalMin = PLAN.reduce((s, t) => s + P[t.p].min * t.b, 0);
  console.log(`\nEquipment-aware plan: ${totalMin} min/week = ${(totalMin / 4680 * 100).toFixed(1)}% utilization`);
  console.log('Oven load per day (1 oven â€” items run sequentially):');
  for (const [day, v] of Object.entries(dayStats)) {
    const bakeH = (v.oven * 0.70 / 60).toFixed(1);
    const warn = v.oven > 500 ? '  âš  heavy â€” plan carefully' : '  âœ“';
    console.log(`  ${day.padEnd(12)} ${String(v.total).padStart(4)} min total | oven ${String(v.oven).padStart(3)} min (â‰ˆ${bakeH}h active)${warn}`);
  }

  // Seed KW 27-31
  for (let kw = 27; kw <= 31; kw++) {
    let plan = existing.find(p => p.year === 2026 && p.weekNumber === kw);
    if (!plan) plan = await req('POST', '/weekly/plans', { year: 2026, weekNumber: kw }, token);

    let n = 0;
    for (const t of PLAN) {
      const prod = P[t.p];
      const res = await req('POST', `/weekly/plans/${plan.id}/tasks`, {
        productId: prod.id,
        plannedDay: t.day,
        quantity: Math.round(prod.yield * t.b),
        estimatedMinutes: Math.round(prod.min * t.b),
        taskType: 'PRODUCTION',
        status: 'PLANNED',
        sortOrder: n,
      }, token);
      if (res.id) n++;
    }
    console.log(`KW ${kw}: ${n} tasks seeded`);
  }
  console.log('\nDone â€” KW 27-31 updated with equipment-aware plan.');
}

main().catch(console.error);
