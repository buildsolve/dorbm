const BASE = 'http://localhost:4000/api';

async function apiFetch(path, method = 'GET', body = null, token = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw Object.assign(new Error(`${method} ${path} → ${res.status}`), { data: json });
  return json;
}

const CATEGORIES = [
  { name: 'Layer Cakes',             description: 'Tall, multi-layer cakes with frosting or fillings. Same production line, same decoration workflow, similar storage.' },
  { name: 'Tarts & Tortes',          description: 'Flat, elegant cakes with crust or sponge base. Same baking trays, same cooling racks, similar ingredient ratios.' },
  { name: 'Cheesecakes',             description: 'All cheesecake variants, large and mini. Unique baking times, cooling, and storage needs.' },
  { name: 'Cakes & Loafs',           description: 'Simple, single-layer cakes and loaf cakes. High-margin, high-volume, low-complexity products.' },
  { name: 'Cupcakes & Törtchen',     description: 'Small, individual cakes. Same piping, same packaging, same production line.' },
  { name: 'Cookies & Small Bites',   description: 'Small baked goods with high margins. Short bake time, long shelf life, easy scaling.' },
  { name: 'Frozen & Cold Desserts',  description: 'Products requiring freezing or cold storage. Different storage, production, and cost curve.' },
];

// Map product name substrings → category name
// Checked against the 34 products imported from Excel
const PRODUCT_CATEGORY_MAP = [
  // Cheesecakes (check first — names overlap with others)
  { match: /cheesecake/i,           cat: 'Cheesecakes' },
  { match: /skinny cheesecake/i,    cat: 'Cheesecakes' },

  // Frozen & Cold
  { match: /popsicle/i,             cat: 'Frozen & Cold Desserts' },
  { match: /kulfi/i,                cat: 'Frozen & Cold Desserts' },
  { match: /eis cup/i,              cat: 'Frozen & Cold Desserts' },
  { match: /vanille parfait/i,      cat: 'Frozen & Cold Desserts' },
  { match: /parfait/i,              cat: 'Frozen & Cold Desserts' },

  // Cookies & Small Bites
  { match: /cookie/i,               cat: 'Cookies & Small Bites' },
  { match: /brownie/i,              cat: 'Cookies & Small Bites' },

  // Cupcakes & Törtchen
  { match: /cupcake/i,              cat: 'Cupcakes & Törtchen' },
  { match: /törtchen/i,             cat: 'Cupcakes & Törtchen' },
  { match: /tortchen/i,             cat: 'Cupcakes & Törtchen' },
  { match: /macaron/i,              cat: 'Cupcakes & Törtchen' },
  { match: /bento/i,                cat: 'Cupcakes & Törtchen' },

  // Cakes & Loafs
  { match: /banana bread/i,         cat: 'Cakes & Loafs' },
  { match: /bananenbrot/i,          cat: 'Cakes & Loafs' },
  { match: /karotten/i,             cat: 'Cakes & Loafs' },
  { match: /karottenkuchen/i,       cat: 'Cakes & Loafs' },
  { match: /mandelkuchen/i,         cat: 'Cakes & Loafs' },
  { match: /kastenkuchen/i,         cat: 'Cakes & Loafs' },

  // Tarts & Tortes
  { match: /tart/i,                 cat: 'Tarts & Tortes' },
  { match: /tiramisu/i,             cat: 'Tarts & Tortes' },
  { match: /blaubeere/i,            cat: 'Tarts & Tortes' },
  { match: /himbeer pistazi/i,      cat: 'Tarts & Tortes' },
  { match: /sommer trio/i,          cat: 'Tarts & Tortes' },
  { match: /joghurt/i,              cat: 'Tarts & Tortes' },
  { match: /matcha rolle/i,         cat: 'Tarts & Tortes' },

  // Layer Cakes (catch-all for remaining cakes)
  { match: /sacher/i,               cat: 'Layer Cakes' },
  { match: /purple velvet/i,        cat: 'Layer Cakes' },
  { match: /opera/i,                cat: 'Layer Cakes' },
  { match: /pumkin|pumpkin/i,       cat: 'Layer Cakes' },
  { match: /passion fruit/i,        cat: 'Layer Cakes' },
  { match: /almond raspberry/i,     cat: 'Layer Cakes' },
  { match: /kokos rafaello/i,       cat: 'Layer Cakes' },
  { match: /mango coco/i,           cat: 'Layer Cakes' },
  { match: /kuchen/i,               cat: 'Cakes & Loafs' },
];

function classifyProduct(name) {
  for (const { match, cat } of PRODUCT_CATEGORY_MAP) {
    if (match.test(name)) return cat;
  }
  return null;
}

async function main() {
  const token = (await apiFetch('/auth/login', 'POST', { email: 'admin@cakeerp.com', password: 'admin123' })).access_token;
  const get   = p    => apiFetch(p, 'GET', null, token);
  const post  = (p,b) => apiFetch(p, 'POST', b, token);
  const patch = (p,b) => apiFetch(p, 'PATCH', b, token);

  // 1. Fetch existing categories
  const existingCats = await get('/categories');
  const catMap = new Map(existingCats.map(c => [c.name, c.id]));
  console.log(`Existing categories: ${existingCats.map(c => c.name).join(', ') || 'none'}`);

  // 2. Create missing categories
  for (const cat of CATEGORIES) {
    if (catMap.has(cat.name)) {
      console.log(`  ✓ Already exists: ${cat.name}`);
    } else {
      const created = await post('/categories', cat);
      catMap.set(cat.name, created.id);
      console.log(`  + Created: ${cat.name} (${created.id})`);
    }
  }

  // 3. Fetch all products
  const products = await get('/products');
  console.log(`\nAssigning categories to ${products.length} products:`);

  let assigned = 0, skipped = 0;
  for (const prod of products) {
    const catName = classifyProduct(prod.name);
    if (!catName) {
      console.log(`  ⚠ No category match for: "${prod.name}"`);
      skipped++;
      continue;
    }
    const categoryId = catMap.get(catName);
    if (!categoryId) {
      console.log(`  ✗ Category ID not found for: ${catName}`);
      skipped++;
      continue;
    }
    // Skip if already correct
    if (prod.categoryId === categoryId) {
      console.log(`  = ${prod.name.padEnd(40)} already → ${catName}`);
      continue;
    }
    await patch(`/products/${prod.id}`, { categoryId });
    console.log(`  ✓ ${prod.name.padEnd(40)} → ${catName}`);
    assigned++;
  }

  console.log(`\n✅ Done — ${assigned} assigned, ${skipped} skipped`);
}

main().catch(e => { console.error('Fatal:', e.message, e.data); process.exit(1); });
