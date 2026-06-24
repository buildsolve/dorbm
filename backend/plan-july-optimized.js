/**
 * Optimized July 2026 Production Plan — KW 27-31
 *
 * Strategy:
 *   MON — Effizienz-Tag: Mini-Cheesecakes, Eis & Cookies (höchste Rev/min)
 *   TUE — Käsekuchen-Tag: Baked Cheesecake, Royal Raspberry Schnittchen, Karotten Kuchen
 *   WED — Beeren & Sommer-Tarts: Himbeer Pistazien, Blaubeere Zitrone, Tarts
 *   THU — Torten-Tag: Cheesecake 26cm, Opera Torte, Blaubeere-Zitrone Torte
 *   FRI — Cupcakes & Crème-Desserts: Tiramisu, Macaron Törtchen, Sommer Trio
 *   SAT — Leichter Tag (Aushilfe): einfache Artikel
 *
 * Target: ~3725 min/week = 79.6% utilization (78h team capacity)
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

// Products: { id, yield (units/batch), min (labour min/batch), price }
const P = {
  HAFER_CRANBERRY:     { id: 'f995df45-5377-46ce-8e95-07d4d3d0be97', yield: 136, min: 45, price: 4.90 },
  MINI_CHEESECAKE:     { id: '2147935d-833c-4c57-a649-413fd77bdd79', yield: 96,  min: 30, price: 4.50 },
  LIME_MINI_CHEESECAKE:{ id: '6dfc2e41-b970-4c91-8a7d-7ca9303bb2f6', yield: 96,  min: 30, price: 4.20 },
  POPSICLES:           { id: '73efef79-5856-4778-aaf9-edb624b80365', yield: 32,  min: 20, price: 4.90 },
  KULFI:               { id: '77fafc21-d1e5-43d8-a305-6b01cde0a006', yield: 24,  min: 20, price: 4.90 },
  EIS_CUPS:            { id: '05e5b8e2-8205-4cf7-83c3-3f04b03908f8', yield: 36,  min: 30, price: 3.90 },
  SKINNY_CHEESECAKE:   { id: 'ed3f0292-caf0-4719-a955-e74c2b27e56d', yield: 42,  min: 40, price: 5.90 },
  BAKED_CHEESECAKE:    { id: 'e9e25b38-a874-4fb2-8209-d947c4728d01', yield: 112, min: 60, price: 4.90 },
  ROYAL_RASPBERRY:     { id: 'ed3760e0-75c6-4ec6-bd7e-ede8c38fbe69', yield: 120, min: 70, price: 5.50 },
  KAROTTEN_KUCHEN:     { id: 'd02758a8-e121-4068-b23d-2c1c01cb0fa0', yield: 126, min: 60, price: 4.60 },
  CHEESECAKE_26CM:     { id: 'eb104649-e628-4543-a92e-3f0803f398f6', yield: 18,  min: 65, price: 32   },
  HIMBEER_PISTAZIEN:   { id: '16c2cabe-a873-4564-9a55-9a601d5b8235', yield: 64,  min: 90, price: 5.90 },
  BLAUBEERE_ZITRONE:   { id: '0e0e7948-3440-45ba-97d2-ed232a328877', yield: 64,  min: 80, price: 5.20 },
  LEMON_RASPBERRY:     { id: '4272dce6-7cfd-4fda-bab4-2a580283c9aa', yield: 30,  min: 45, price: 6.50 },
  MANGO_COCO:          { id: 'f04562b1-19b2-4fbd-be20-5de9a77fa6cb', yield: 50,  min: 90, price: 7.90 },
  OPERA_TORTE:         { id: '27f0d98f-f22a-40c6-a2cb-9b07a0239ea5', yield: 60,  min: 60, price: 5.90 },
  PASSION_TORTE:       { id: 'bb26a9aa-f9ec-404e-8e62-d394667ae252', yield: 8,   min: 70, price: 38   },
  BLAUBEERE_TORTE:     { id: 'abe18a5d-b6dd-4400-9c6b-5224047fe482', yield: 8,   min: 75, price: 34   },
  CUPCAKES:            { id: '7ba47777-ef1d-418b-a968-a8260ef075bc', yield: 72,  min: 60, price: 4.90 },
  TIRAMISU:            { id: '3b640d57-00e3-4806-acb1-dd7dc8670a9f', yield: 48,  min: 60, price: 5.40 },
  MACARON:             { id: 'da3d66a8-1c82-4833-98fd-54b5bc2dae27', yield: 40,  min: 60, price: 7.90 },
  SOMMER_TRIO:         { id: 'aa50d589-cf27-4b62-85e4-c865ec6282f8', yield: 60,  min: 60, price: 5.90 },
  TULPEN_CUPCAKES:     { id: '24c64d55-4435-4e54-a461-94463880859d', yield: 24,  min: 45, price: 7.90 },
  VANILLE_PARFAIT:     { id: '05a4e0ed-4cce-4272-8f31-42a0b46a6ed0', yield: 62,  min: 45, price: 4.20 },
  PURPLE_VELVET:       { id: 'd1b00558-b76c-4495-8832-985a3c1829a9', yield: 48,  min: 50, price: 5.90 },
  KOKOS_RAFAELLO:      { id: '698833c9-242b-4587-8e17-c61a5a2b8d1f', yield: 56,  min: 80, price: 5.20 },
  VEGANE_COOKIES:      { id: '9b801bce-068c-44e9-98e5-ab8cfabf506e', yield: 60,  min: 30, price: 2.50 },
};

// Template: { p = product key, b = batches, day }
// estimatedMinutes = b × P[p].min,  quantity = b × P[p].yield
const TEMPLATE = [
  // MON — 650 min
  { p: 'HAFER_CRANBERRY',      b: 4, day: 'Montag'     }, // 4×45=180
  { p: 'MINI_CHEESECAKE',      b: 3, day: 'Montag'     }, // 3×30= 90
  { p: 'LIME_MINI_CHEESECAKE', b: 3, day: 'Montag'     }, // 3×30= 90
  { p: 'POPSICLES',            b: 4, day: 'Montag'     }, // 4×20= 80
  { p: 'KULFI',                b: 4, day: 'Montag'     }, // 4×20= 80
  { p: 'EIS_CUPS',             b: 3, day: 'Montag'     }, // 3×30= 90
  { p: 'SKINNY_CHEESECAKE',    b: 1, day: 'Montag'     }, // 1×40= 40  → 650

  // TUE — 645 min
  { p: 'BAKED_CHEESECAKE',     b: 3, day: 'Dienstag'   }, // 3×60=180
  { p: 'ROYAL_RASPBERRY',      b: 3, day: 'Dienstag'   }, // 3×70=210
  { p: 'KAROTTEN_KUCHEN',      b: 2, day: 'Dienstag'   }, // 2×60=120
  { p: 'SKINNY_CHEESECAKE',    b: 1, day: 'Dienstag'   }, // 1×40= 40
  { p: 'CHEESECAKE_26CM',      b: 1, day: 'Dienstag'   }, // 1×65= 65
  { p: 'MINI_CHEESECAKE',      b: 1, day: 'Dienstag'   }, // 1×30= 30  → 645

  // WED — 655 min
  { p: 'HIMBEER_PISTAZIEN',    b: 3, day: 'Mittwoch'   }, // 3×90=270
  { p: 'BLAUBEERE_ZITRONE',    b: 2, day: 'Mittwoch'   }, // 2×80=160
  { p: 'LEMON_RASPBERRY',      b: 3, day: 'Mittwoch'   }, // 3×45=135
  { p: 'MANGO_COCO',           b: 1, day: 'Mittwoch'   }, // 1×90= 90  → 655

  // THU — 600 min
  { p: 'CHEESECAKE_26CM',      b: 4, day: 'Donnerstag' }, // 4×65=260
  { p: 'OPERA_TORTE',          b: 2, day: 'Donnerstag' }, // 2×60=120
  { p: 'PASSION_TORTE',        b: 1, day: 'Donnerstag' }, // 1×70= 70
  { p: 'BLAUBEERE_TORTE',      b: 2, day: 'Donnerstag' }, // 2×75=150  → 600

  // FRI — 690 min
  { p: 'CUPCAKES',             b: 3, day: 'Freitag'    }, // 3×60=180
  { p: 'TIRAMISU',             b: 3, day: 'Freitag'    }, // 3×60=180
  { p: 'MACARON',              b: 2, day: 'Freitag'    }, // 2×60=120
  { p: 'SOMMER_TRIO',          b: 2, day: 'Freitag'    }, // 2×60=120
  { p: 'TULPEN_CUPCAKES',      b: 1, day: 'Freitag'    }, // 1×45= 45
  { p: 'VANILLE_PARFAIT',      b: 1, day: 'Freitag'    }, // 1×45= 45  → 690

  // SAT — 485 min (Aushilfe: einfache Artikel ohne komplexe Öfen)
  { p: 'PURPLE_VELVET',        b: 2, day: 'Samstag'    }, // 2×50=100
  { p: 'KOKOS_RAFAELLO',       b: 2, day: 'Samstag'    }, // 2×80=160
  { p: 'VANILLE_PARFAIT',      b: 1, day: 'Samstag'    }, // 1×45= 45
  { p: 'VEGANE_COOKIES',       b: 2, day: 'Samstag'    }, // 2×30= 60
  { p: 'MANGO_COCO',           b: 1, day: 'Samstag'    }, // 1×90= 90
  { p: 'EIS_CUPS',             b: 1, day: 'Samstag'    }, // 1×30= 30  → 485
  // Total: 650+645+655+600+690+485 = 3725 min = 79.6%
];

async function main() {
  const auth = await req('POST', '/auth/login', { email: 'admin@cakeerp.com', password: 'admin123' });
  const token = auth.access_token;

  // Verify no existing KW 27-31 plans
  const existing = await req('GET', '/weekly/plans', null, token);
  const july = existing.filter(p => p.year === 2026 && p.weekNumber >= 27 && p.weekNumber <= 31);
  if (july.length > 0) {
    console.log(`Found ${july.length} existing plans — clearing tasks first...`);
    for (const plan of july) {
      await req('DELETE', `/weekly/plans/${plan.id}/tasks`, null, token);
    }
  }

  const totalMin = TEMPLATE.reduce((s, t) => s + P[t.p].min * t.b, 0);
  const totalRev = TEMPLATE.reduce((s, t) => s + P[t.p].price * P[t.p].yield * t.b, 0);
  console.log(`Template: ${totalMin} min/week = ${(totalMin/4680*100).toFixed(1)}% utilization`);
  console.log(`Expected revenue/week: €${totalRev.toFixed(2)}`);

  for (let kw = 27; kw <= 31; kw++) {
    // Get or create plan
    let plan = existing.find(p => p.year === 2026 && p.weekNumber === kw);
    if (!plan) {
      plan = await req('POST', '/weekly/plans', { year: 2026, weekNumber: kw }, token);
      console.log(`Created KW ${kw} (id: ${plan.id})`);
    } else {
      console.log(`Using existing KW ${kw} (id: ${plan.id})`);
    }

    let taskCount = 0;
    for (const t of TEMPLATE) {
      const prod = P[t.p];
      const body = {
        productId: prod.id,
        plannedDay: t.day,
        quantity: prod.yield * t.b,
        estimatedMinutes: prod.min * t.b,
        taskType: 'PRODUCTION',
        status: 'PLANNED',
        sortOrder: taskCount,
      };
      const result = await req('POST', `/weekly/plans/${plan.id}/tasks`, body, token);
      if (result.id) {
        taskCount++;
      } else {
        console.error(`  ✗ Failed task ${t.p} on ${t.day}:`, JSON.stringify(result).slice(0, 200));
      }
    }
    console.log(`  KW ${kw}: ${taskCount} tasks added`);
  }

  console.log('\nDone! KW 27-31 optimized plan seeded.');
  console.log('Reload the Wochenplanung page to see the new plans.');
}

main().catch(console.error);
