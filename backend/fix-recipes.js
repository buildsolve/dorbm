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
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw Object.assign(new Error(`${method} ${path} → ${res.status}`), { data: json });
  return json;
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'string') { const n = parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n; }
  return typeof v === 'number' ? v : null;
}

function parseIngredients(sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const skip = ['Back-','Rezept','Zwischen','Stück','KOSTEN','Produktion','Grundkosten','Gestehungs','Verluste','Mehrwert','Kalkulierter','Empfohlener','NETTOPREI','Rohmaterial','Gewinn','Extra'];
  const ingredients = [];
  let labourMinutes = 0, yieldPieces = 1;
  for (const row of rows) {
    const weight = numOrNull(row[0]);
    const name = row[2] ? String(row[2]).trim() : '';
    if (weight && weight > 0 && name && name.length > 1 && !skip.some(s => name.startsWith(s))) {
      ingredients.push({ weightG: weight, name });
    }
    const label = String(row[1] || '').toLowerCase();
    const val3 = numOrNull(row[3]), val4 = numOrNull(row[4]);
    if ((label.includes('produktive arbeit') || (label.includes('produktionslöhne') && label.includes('min'))) && val3) labourMinutes = val3;
    if (label.includes('stückzahl') && val4) yieldPieces = val4;
  }
  return { ingredients, labourMinutes, yieldPieces };
}

// Sheets that had failed recipes (maps product name → sheet name)
const FAILED = {
  'Baked Cheesecake':       'Baked Cheesecake',
  'Mini Cheesecake':        'mini cheesecake',
  'Lime Mini Cheesecake':   'lime mini cheesecake',
  'Vanille Parfait':        'Vanille Parfait',
  'Karotten Kuchen':        'Karotten Kuchen',
  'Sacher Torte':           'Sacher',
  'Tiramisu':               'erdbeere-Basilikum',
  'Joghurt Törtchen':       'Joghurt Törtchen',
  'Hafer Cranberry Cookies':'Hafer Cranberry Cookies',
  'Opera Torte':            'Opera',
  'Mango Coco Tart':        'Mango Coco Tart',
  'Himbeer Pistazien':      'Himbeer-Pistaccio',
};

async function main() {
  const token = (await apiFetch('/auth/login', 'POST', { email: 'admin@cakeerp.com', password: 'admin123' })).access_token;
  const post = (p, b) => apiFetch(p, 'POST', b, token);
  const patch = (p, b) => apiFetch(p, 'PATCH', b, token);
  const get = (p) => apiFetch(p, 'GET', null, token);

  // Load all ingredients from DB
  const allIngs = await get('/inventory/ingredients');
  const ingIdMap = new Map(allIngs.map(i => [i.name.toLowerCase().trim(), i.id]));
  console.log(`Loaded ${ingIdMap.size} ingredients from DB`);

  // Load products to find ones without recipe
  const allProds = await get('/products');
  const prodList = allProds.data || allProds;
  const prodMap = new Map(prodList.map(p => [p.name, p]));

  let fixed = 0;
  for (const [productName, sheetName] of Object.entries(FAILED)) {
    const product = prodMap.get(productName);
    if (!product) { console.log(`  ⚠ Product not found: ${productName}`); continue; }
    if (product.recipeId) { console.log(`  ✓ Already has recipe: ${productName}`); fixed++; continue; }

    const { ingredients, labourMinutes, yieldPieces } = parseIngredients(sheetName);

    // Merge duplicate ingredients
    const compMap = new Map();
    for (const ing of ingredients) {
      const ingId = ingIdMap.get(ing.name.toLowerCase().trim());
      if (!ingId) continue;
      compMap.set(ingId, (compMap.get(ingId) ?? 0) + ing.weightG / 1000);
    }
    const components = Array.from(compMap.entries()).map(([ingredientId, quantity]) => ({
      ingredientId, quantity: Math.round(quantity * 10000) / 10000,
    }));

    console.log(`Creating recipe for ${productName} (${components.length} unique ingredients)...`);
    try {
      const recipe = await post('/recipes', {
        name: productName,
        code: 'RZP_' + productName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12).toUpperCase() + '_' + Math.random().toString(36).substring(2, 5).toUpperCase(),
        yield: yieldPieces,
        labourTimeMinutes: labourMinutes,
        components,
      });
      // Patch the product to link recipe
      await patch(`/products/${product.id}`, { recipeId: recipe.id });
      console.log(`  ✅ ${productName} → recipe ${recipe.id.substring(0, 8)}... linked`);
      fixed++;
    } catch (e) {
      console.error(`  ✗ ${productName}: ${JSON.stringify(e.data) || e.message}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed}/${Object.keys(FAILED).length} products`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
