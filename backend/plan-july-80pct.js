/**
 * plan-july-80pct.js
 * Replaces tasks in KW 27-31 with a summer mix targeting 80% capacity
 * (78h/week × 80% = 62.4h = 3744 min/week)
 */
const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 4000,
      path: `/api${path}`, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ─── Product ID map (from live DB) ───────────────────────────────────────────
const P = {
  ALMOND_RASP:     { id: 'b2283e0c-04bf-4803-af29-7d409e3e60b4', min: 60,  yield: 42 },
  BAKED_CC:        { id: 'e9e25b38-a874-4fb2-8209-d947c4728d01', min: 60,  yield: 112 },
  BLAUBEER_SLICE:  { id: '0e0e7948-3440-45ba-97d2-ed232a328877', min: 80,  yield: 64 },
  BLAUBEER_TORTE:  { id: 'abe18a5d-b6dd-4400-9c6b-5224047fe482', min: 75,  yield: 8 },
  CHEESECAKE_26:   { id: 'eb104649-e628-4543-a92e-3f0803f398f6', min: 65,  yield: 18 },
  CUPCAKES:        { id: '7ba47777-ef1d-418b-a968-a8260ef075bc', min: 60,  yield: 72 },
  EIS_CUPS:        { id: '05e5b8e2-8205-4cf7-83c3-3f04b03908f8', min: 30,  yield: 36 },
  HIMBEER_PIST:    { id: '16c2cabe-a873-4564-9a55-9a601d5b8235', min: 90,  yield: 64 },
  KOKOS_RAFAELLO:  { id: '698833c9-242b-4587-8e17-c61a5a2b8d1f', min: 80,  yield: 56 },
  KOKOS_TORTE:     { id: '407f5c57-352e-40ec-b15e-e6044f41d5f6', min: 75,  yield: 8 },
  KULFI:           { id: '77fafc21-d1e5-43d8-a305-6b01cde0a006', min: 20,  yield: 24 },
  LEMON_RASP_TART: { id: '4272dce6-7cfd-4fda-bab4-2a580283c9aa', min: 45,  yield: 30 },
  LIME_MINI_CC:    { id: '6dfc2e41-b970-4c91-8a7d-7ca9303bb2f6', min: 30,  yield: 96 },
  MACARON:         { id: 'da3d66a8-1c82-4833-98fd-54b5bc2dae27', min: 60,  yield: 40 },
  MANGO_TART:      { id: 'e68afc4f-b19c-45f0-8514-b9610012e419', min: 90,  yield: 48 },
  MATCHA_ROLLE:    { id: 'a3b810b3-dbbb-49b3-8441-c3704204c549', min: 60,  yield: 24 },
  OPERA:           { id: '27f0d98f-f22a-40c6-a2cb-9b07a0239ea5', min: 60,  yield: 60 },
  POPSICLES:       { id: '73efef79-5856-4778-aaf9-edb624b80365', min: 20,  yield: 32 },
  ROYAL_RASP:      { id: 'ed3760e0-75c6-4ec6-bd7e-ede8c38fbe69', min: 70,  yield: 120 },
  SACHER:          { id: '8127d746-5418-475e-b8ea-37fc2f2cf605', min: 70,  yield: 80 },
  SKINNY_CC:       { id: 'ed3f0292-caf0-4719-a955-e74c2b27e56d', min: 40,  yield: 42 },
  SOMMER_TRIO:     { id: 'aa50d589-cf27-4b62-85e4-c865ec6282f8', min: 60,  yield: 60 },
  TIRAMISU:        { id: '3b640d57-00e3-4806-acb1-dd7dc8670a9f', min: 60,  yield: 48 },
  TULPEN_CUP:      { id: '24c64d55-4435-4e54-a461-94463880859d', min: 45,  yield: 24 },
};

// ─── Weekly template: ~3750 min/week = 80.1% of 4680min (78h) ────────────────
// Each entry: [product_key, day, batches]
// Organised by theme-day for kitchen flow
const WEEK_TEMPLATE = [
  // ── MONTAG — Eis & Beeren (700 min) ──────────────────────────────────────
  ['HIMBEER_PIST',   'MON', 3],  // 270 min  berry flagship
  ['BLAUBEER_SLICE', 'MON', 2],  // 160 min
  ['EIS_CUPS',       'MON', 3],  //  90 min
  ['KULFI',          'MON', 3],  //  60 min
  ['POPSICLES',      'MON', 3],  //  60 min
  ['TIRAMISU',       'MON', 1],  //  60 min
  // MON total: 700 min

  // ── DIENSTAG — Tarts & Schnitten (645 min) ───────────────────────────────
  ['MANGO_TART',     'TUE', 3],  // 270 min  summer highlight
  ['LEMON_RASP_TART','TUE', 3],  // 135 min
  ['CUPCAKES',       'TUE', 2],  // 120 min
  ['TIRAMISU',       'TUE', 2],  // 120 min
  // TUE total: 645 min

  // ── MITTWOCH — Cheesecakes & Schnitten (675 min) ─────────────────────────
  ['CHEESECAKE_26',  'WED', 3],  // 195 min
  ['BAKED_CC',       'WED', 2],  // 120 min
  ['ALMOND_RASP',    'WED', 2],  // 120 min
  ['ROYAL_RASP',     'WED', 2],  // 140 min
  ['SOMMER_TRIO',    'WED', 1],  //  60 min
  ['SKINNY_CC',      'WED', 1],  //  40 min
  // WED total: 675 min

  // ── DONNERSTAG — Torten (670 min) ────────────────────────────────────────
  ['SACHER',         'THU', 3],  // 210 min
  ['OPERA',          'THU', 3],  // 180 min
  ['KOKOS_RAFAELLO', 'THU', 2],  // 160 min
  ['CUPCAKES',       'THU', 1],  //  60 min
  ['MACARON',        'THU', 1],  //  60 min
  // THU total: 670 min

  // ── FREITAG — Finishing & Verpacken (660 min) ────────────────────────────
  ['BLAUBEER_TORTE', 'FRI', 2],  // 150 min  whole-cake orders
  ['KOKOS_TORTE',    'FRI', 1],  //  75 min
  ['CUPCAKES',       'FRI', 2],  // 120 min
  ['TIRAMISU',       'FRI', 2],  // 120 min
  ['LIME_MINI_CC',   'FRI', 3],  //  90 min
  ['TULPEN_CUP',     'FRI', 1],  //  45 min
  ['EIS_CUPS',       'FRI', 2],  //  60 min
  // FRI total: 660 min

  // ── SAMSTAG — Aushilfe-Tag, leicht (400 min) ─────────────────────────────
  ['EIS_CUPS',       'SAT', 2],  //  60 min
  ['KULFI',          'SAT', 2],  //  40 min
  ['POPSICLES',      'SAT', 2],  //  40 min
  ['SKINNY_CC',      'SAT', 2],  //  80 min
  ['MATCHA_ROLLE',   'SAT', 2],  // 120 min
  ['TIRAMISU',       'SAT', 1],  //  60 min
  // SAT total: 400 min
];
// Grand total: 700+645+675+670+660+400 = 3750 min = 80.1% utilisation

async function main() {
  // 1. Login
  const auth = await req('POST', '/auth/login', { email: 'admin@cakeerp.com', password: 'admin123' });
  const token = auth.access_token;
  if (!token) { console.error('Login failed', auth); process.exit(1); }

  // 2. Get all plans, find KW 27-31/2026
  const plans = await req('GET', '/weekly/plans', null, token);
  const julyPlans = plans.filter(p => p.year === 2026 && p.weekNumber >= 27 && p.weekNumber <= 31);
  console.log(`Found ${julyPlans.length} July plans: ${julyPlans.map(p => `KW${p.weekNumber}`).join(', ')}`);

  let totalMinutes = 0;
  let totalTasks = 0;

  for (const plan of julyPlans) {
    console.log(`\n── KW ${plan.weekNumber} (${plan.id}) ──`);

    // 3. Clear existing tasks
    await req('DELETE', `/weekly/plans/${plan.id}/tasks`, null, token);
    console.log('  Cleared existing tasks');

    // 4. Add new tasks from template
    let weekMin = 0;
    for (const [productKey, day, batches] of WEEK_TEMPLATE) {
      const prod = P[productKey];
      if (!prod) { console.warn(`  Unknown product key: ${productKey}`); continue; }
      const estimatedMinutes = prod.min * batches;
      const quantity = prod.yield * batches;
      await req('POST', `/weekly/plans/${plan.id}/tasks`, {
        productId: prod.id,
        plannedDay: day,
        quantity,
        estimatedMinutes,
        notes: `Juli-Plan: ${batches}x Batch`,
        status: 'PLANNED',
      }, token);
      weekMin += estimatedMinutes;
      totalTasks++;
    }

    totalMinutes += weekMin;
    const pct = ((weekMin / 4680) * 100).toFixed(1);
    console.log(`  ✓ ${WEEK_TEMPLATE.length} tasks added — ${weekMin} min/week = ${pct}% utilisation`);
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`July plan complete!`);
  console.log(`Weeks planned: KW 27–31 (${julyPlans.length} weeks)`);
  console.log(`Tasks added: ${totalTasks}`);
  console.log(`Avg minutes/week: ${(totalMinutes / julyPlans.length).toFixed(0)} min`);
  console.log(`Avg utilisation: ${((totalMinutes / julyPlans.length / 4680) * 100).toFixed(1)}%`);
  console.log(`Capacity: 78h/week | Target: 80% = 62.4h = 3744 min`);
}

main().catch(console.error);
