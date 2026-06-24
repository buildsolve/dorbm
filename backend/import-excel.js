const XLSX = require('./node_modules/xlsx');

const BASE = 'http://localhost:4000/api';
const wb = XLSX.readFile('C:/Users/User/Downloads/Calculation-Daily Cakes.xlsx');

async function apiFetch(path, method = 'GET', body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw Object.assign(new Error(`${method} ${path} → ${res.status}`), { data: json });
  return json;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
async function login() {
  const r = await apiFetch('/auth/login', 'POST', { email: 'admin@cakeerp.com', password: 'admin123' });
  return r.access_token;
}

// ─── PARSE HELPERS ────────────────────────────────────────────────────────────
function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const cleaned = v.replace(',', '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return typeof v === 'number' ? v : null;
}

function parseSheet(sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Product name: row 2 col 1 (Artikel), fallback to sheet name
  let productName = '';
  for (let i = 1; i <= 4; i++) {
    const r = rows[i] || [];
    if (r[0] && String(r[0]).toLowerCase().includes('artikel') && r[1]) {
      productName = String(r[1]).trim(); break;
    }
    if (r[1] && String(r[0]) === '' && r[1] && !productName) productName = String(r[1]).trim();
  }
  if (!productName || productName.length < 2) productName = sheetName.trim();

  // Ingredients: rows where col[0] is a positive number (weight in grams) and col[2] is a string name
  const ingredients = [];
  for (const row of rows) {
    const weight = numOrNull(row[0]);
    const name = row[2] ? String(row[2]).trim() : '';
    const kgPrice = numOrNull(row[3]);
    if (weight && weight > 0 && name && name.length > 1 && !name.startsWith('Back-') && !name.startsWith('Rezept') && !name.startsWith('Zwischen') && !name.startsWith('Stück') && !name.startsWith('KOSTEN') && !name.startsWith('Produktion') && !name.startsWith('Grundkosten') && !name.startsWith('Gestehungs') && !name.startsWith('Verluste') && !name.startsWith('Mehrwert') && !name.startsWith('Kalkulierter') && !name.startsWith('Empfohlener') && !name.startsWith('NETTOPREI') && !name.startsWith('Rohmaterial') && !name.startsWith('Gewinn') && !name.startsWith('Extra')) {
      ingredients.push({ weightG: weight, name, kgPrice: kgPrice ?? 0 });
    }
  }

  // Find key values by scanning label keywords
  let labourMinutes = 0;
  let yieldPieces = 1;
  let sellingPrice = null;
  let totalGewinn = null;

  for (const row of rows) {
    const label = String(row[1] || '').toLowerCase();
    const val4 = numOrNull(row[4]);
    const val3 = numOrNull(row[3]);
    if ((label.includes('produktive arbeit') || label.includes('produktionslöhne') && label.includes('min')) && val3) {
      labourMinutes = val3;
    }
    if (label.includes('stückzahl') && val4) yieldPieces = val4;
    const col2 = String(row[2] || '').toLowerCase();
    if (col2.includes('aktueller verkaufspreis')) {
      sellingPrice = val4 !== null ? val4 : numOrNull(row[4]);
    }
    if (col2.includes('total gewinn')) {
      totalGewinn = val4 !== null ? val4 : null;
    }
  }

  // Fallback selling price from comment columns
  if (!sellingPrice) {
    for (const row of rows) {
      for (let c = 3; c < 8; c++) {
        const v = row[c];
        if (typeof v === 'string' && v.match(/\d,\d\d/)) {
          const n = numOrNull(v); if (n && n > 1 && n < 50) { sellingPrice = n; break; }
        }
      }
      if (sellingPrice) break;
    }
  }

  return { productName, ingredients, labourMinutes, yieldPieces, sellingPrice: sellingPrice || 0, totalGewinn };
}

// ─── PRODUCT SHEETS TO IMPORT ─────────────────────────────────────────────────
const SHEETS = {
  'Baked Cheesecake':           { name: 'Baked Cheesecake', category: 'Käsekuchen' },
  'mini cheesecake':            { name: 'Mini Cheesecake', category: 'Käsekuchen' },
  'lime mini cheesecake':       { name: 'Lime Mini Cheesecake', category: 'Käsekuchen' },
  'skinny cheesecake':          { name: 'Skinny Cheesecake', category: 'Käsekuchen' },
  'Schoko-Cheesecake':          { name: 'Schoko Cheesecake', category: 'Käsekuchen' },
  'EIS CUPS':                   { name: 'Eis Cups', category: 'Eis & Kalt' },
  'Kulfi Eis':                  { name: 'Kulfi Eis', category: 'Eis & Kalt' },
  'Popsicles':                  { name: 'Popsicles', category: 'Eis & Kalt' },
  'Vanille Parfait':            { name: 'Vanille Parfait', category: 'Eis & Kalt' },
  'Karotten Kuchen':            { name: 'Karotten Kuchen', category: 'Kuchen' },
  'Sacher':                     { name: 'Sacher Torte', category: 'Torten' },
  'mango coco cake':            { name: 'Mandelkuchen MF', category: 'Kuchen' },
  'erdbeere-Basilikum':         { name: 'Tiramisu', category: 'Torten' },
  'Kokos Rafaello | Vegan MF':  { name: 'Kokos Rafaello Vegan MF', category: 'Vegan' },
  'Blaubeere Zitrone':          { name: 'Blaubeere Zitrone', category: 'Torten' },
  'Joghurt Törtchen':           { name: 'Joghurt Törtchen', category: 'Törtchen' },
  'Matcha Rolle':               { name: 'Matcha Rolle', category: 'Rollen & Gebäck' },
  'Sommertrio':                 { name: 'Sommer Trio', category: 'Torten' },
  'Purple velvet':              { name: 'Purple Velvet', category: 'Torten' },
  'Bananabread':                { name: 'Banana Bread', category: 'Kuchen' },
  'Cupcakes':                   { name: 'Cupcakes', category: 'Rollen & Gebäck' },
  'Hafer Cranberry Cookies':    { name: 'Hafer Cranberry Cookies', category: 'Cookies' },
  'Opera':                      { name: 'Opera Torte', category: 'Torten' },
  'Valentins Brownies':         { name: 'Valentins Brownies', category: 'Rollen & Gebäck' },
  'Valentins Cookies':          { name: 'Valentins Cookies', category: 'Cookies' },
  'Mango Coco Tart':            { name: 'Mango Coco Tart', category: 'Torten' },
  'Almond Raspberry VEGAN':     { name: 'Almond Raspberry Vegan', category: 'Vegan' },
  'Passionfrucht VEGAN | MF':   { name: 'Passion Fruit Vegan MF', category: 'Vegan' },
  'Lemon Raspberry Tart':       { name: 'Lemon Raspberry Tart', category: 'Torten' },
  'Himbeer-Pistaccio':          { name: 'Himbeer Pistazien', category: 'Torten' },
  'Pumkin Orange':              { name: 'Pumkin Orange', category: 'Torten' },
  ' mini bento schokopistazie': { name: 'Mini Bento Schokopistazie', category: 'Törtchen' },
  'macaron Törtchen Muttertag': { name: 'Macaron Törtchen', category: 'Törtchen' },
  'Tulpen Cupcakes Muttertag':  { name: 'Tulpen Cupcakes', category: 'Rollen & Gebäck' },
};

async function main() {
  const token = await login();
  const post = (path, body) => apiFetch(path, 'POST', body, token);
  const get  = (path)       => apiFetch(path, 'GET', null, token);

  // ─── 1. COLLECT ALL UNIQUE INGREDIENTS ──────────────────────────────────────
  const ingMap = new Map(); // normalized name → { name, kgPrice }
  for (const sheetName of Object.keys(SHEETS)) {
    const d = parseSheet(sheetName);
    if (!d) continue;
    for (const ing of d.ingredients) {
      const key = ing.name.toLowerCase().trim();
      if (!ingMap.has(key) || (ingMap.get(key).kgPrice === 0 && ing.kgPrice > 0)) {
        ingMap.set(key, { name: ing.name, kgPrice: ing.kgPrice });
      }
    }
  }

  console.log(`\n📦 Creating ${ingMap.size} ingredients...`);

  // Create all ingredients and build id map
  const ingIdMap = new Map(); // normalized name → DB id
  for (const [key, ing] of ingMap) {
    const code = ing.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20).toUpperCase();
    try {
      const r = await post('/inventory/ingredients', {
        name: ing.name,
        code: code + '_' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        unit: 'kg',
        unitCost: ing.kgPrice,
        reorderLevel: 1,
        currentStock: 0,
      });
      ingIdMap.set(key, r.id);
      process.stdout.write('.');
    } catch (e) {
      try {
        const r = await post('/inventory/ingredients', {
          name: ing.name,
          code: 'ING_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 4).toUpperCase(),
          unit: 'kg',
          unitCost: ing.kgPrice,
          reorderLevel: 1,
          currentStock: 0,
        });
        ingIdMap.set(key, r.id);
        process.stdout.write('.');
      } catch (e2) {
        console.error(`\n  ✗ Ingredient "${ing.name}": ${JSON.stringify(e2.data) || e2.message}`);
      }
    }
  }
  console.log(`\n✅ Ingredients done (${ingIdMap.size} created)`);

  // ─── 2. CATEGORIES ───────────────────────────────────────────────────────────
  const categories = [...new Set(Object.values(SHEETS).map(s => s.category))];
  const catIdMap = new Map();
  console.log(`\n📁 Creating ${categories.length} categories...`);
  for (const cat of categories) {
    try {
      const r = await post('/products/categories', { name: cat, description: cat });
      catIdMap.set(cat, r.id);
    } catch (e) {
      try {
        const list = await get('/products/categories');
        const existing = list.find(c => c.name === cat);
        if (existing) catIdMap.set(cat, existing.id);
      } catch {}
    }
  }
  console.log(`✅ Categories: ${[...catIdMap.keys()].join(', ')}`);

  // ─── 3. PRODUCTS + RECIPES ──────────────────────────────────────────────────
  console.log(`\n🎂 Creating ${Object.keys(SHEETS).length} products with recipes...`);
  let created = 0;
  for (const [sheetName, meta] of Object.entries(SHEETS)) {
    const d = parseSheet(sheetName);
    if (!d) { console.log(`  ⚠ Sheet not found: ${sheetName}`); continue; }

    // Build recipe components — merge duplicates (same ingredient used multiple times)
    const compMap = new Map(); // ingredientId → total qty kg
    for (const ing of d.ingredients) {
      const key = ing.name.toLowerCase().trim();
      const ingId = ingIdMap.get(key);
      if (!ingId) continue;
      const qtyKg = ing.weightG / 1000;
      compMap.set(ingId, (compMap.get(ingId) ?? 0) + qtyKg);
    }
    const components = Array.from(compMap.entries()).map(([ingredientId, quantity]) => ({ ingredientId, quantity: Math.round(quantity * 10000) / 10000 }));

    // Labour cost per piece
    const totalLabourCost = d.labourMinutes * 0.92; // €0.92/min wage rate from Excel
    const labourCostPerPiece = d.yieldPieces > 0 ? totalLabourCost / d.yieldPieces : 0;

    // Create recipe
    let recipeId = null;
    try {
      const recipeCode = 'RZP_' + meta.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12).toUpperCase() + '_' + Math.random().toString(36).substring(2, 5).toUpperCase();
      const r = await post('/recipes', {
        name: meta.name,
        code: recipeCode,
        description: `Imported from Excel: ${sheetName}`,
        yield: d.yieldPieces,
        labourTimeMinutes: d.labourMinutes,
        components: components.map(c => ({ ingredientId: c.ingredientId, quantity: c.quantity })),
      });
      recipeId = r.id;
    } catch (e) {
      console.error(`\n  ✗ Recipe "${meta.name}": ${JSON.stringify(e.data) || e.message}`);
    }

    try {
      const productCode = 'PRD_' + meta.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase() + '_' + Math.random().toString(36).substring(2, 5).toUpperCase();
      await post('/products', {
        name: meta.name,
        code: productCode,
        sellingPrice: d.sellingPrice,
        laborCost: Math.round(labourCostPerPiece * 100) / 100,
        overheadCost: 0,
        packagingCost: 0,
        categoryId: catIdMap.get(meta.category) || null,
        recipeId: recipeId || null,
        isActive: true,
      });
      created++;
      process.stdout.write('🎂');
    } catch (e) {
      console.error(`\n  ✗ Product "${meta.name}": ${JSON.stringify(e.data) || e.message}`);
    }
  }

  console.log(`\n\n✅ Import complete! ${created}/${Object.keys(SHEETS).length} products created.`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
