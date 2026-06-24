const BASE = 'http://localhost:4000/api';

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

// Baking times in minutes based on product knowledge
// 0 = no baking (chilled/frozen/no-bake)
const BAKING_TIMES = {
  'Baked Cheesecake':          55,  // classic cheesecake water bath
  'Mini Cheesecake':           28,  // smaller cheesecakes
  'Lime Mini Cheesecake':      28,
  'Skinny Cheesecake':         35,  // lighter batter, slightly less
  'Schoko Cheesecake':         50,
  'Eis Cups':                   0,  // no-bake, chilled
  'Kulfi Eis':                  0,  // frozen
  'Popsicles':                  0,  // frozen
  'Vanille Parfait':            0,  // frozen parfait
  'Karotten Kuchen':           45,  // carrot cake
  'Sacher Torte':              40,  // Sachertorte sponge
  'Mandelkuchen MF':           40,  // almond/coconut cake
  'Tiramisu':                   0,  // no-bake
  'Kokos Rafaello Vegan MF':    0,  // no-bake, chilled
  'Blaubeere Zitrone':         35,  // sponge base
  'Joghurt Törtchen':          20,  // tart shells
  'Matcha Rolle':              12,  // Swiss roll, short bake
  'Sommer Trio':               30,  // chocolate sponge base
  'Purple Velvet':             30,  // velvet sponge
  'Banana Bread':              60,  // dense loaf, long bake
  'Cupcakes':                  20,  // standard cupcakes
  'Hafer Cranberry Cookies':   13,  // cookies
  'Opera Torte':               25,  // joconde sponge layers
  'Valentins Brownies':        30,  // brownie
  'Valentins Cookies':         13,  // shortbread cookies
  'Mango Coco Tart':           25,  // tart shell + sponge
  'Almond Raspberry Vegan':    35,  // vegan sponge
  'Passion Fruit Vegan MF':    30,
  'Lemon Raspberry Tart':      22,  // tart shell
  'Himbeer Pistazien':         30,  // sponge base
  'Pumkin Orange':             50,  // pumpkin cake, dense
  'Mini Bento Schokopistazie': 22,  // small chocolate sponge
  'Macaron Törtchen':          16,  // macarons: precise timing
  'Tulpen Cupcakes':           20,
};

async function main() {
  const token = (await apiFetch('/auth/login', 'POST', { email: 'admin@cakeerp.com', password: 'admin123' })).access_token;
  const get  = (p)    => apiFetch(p, 'GET', null, token);
  const patch = (p,b) => apiFetch(p, 'PATCH', b, token);

  const recipes = await get('/recipes');
  console.log(`Found ${recipes.length} recipes\n`);

  let updated = 0, skipped = 0;
  for (const recipe of recipes) {
    const bakingTime = BAKING_TIMES[recipe.name];
    if (bakingTime === undefined) {
      console.log(`  ⚠ No baking time defined for: "${recipe.name}"`);
      skipped++;
      continue;
    }
    await patch(`/recipes/${recipe.id}`, { bakingTimeMinutes: bakingTime });
    const label = bakingTime === 0 ? 'no bake' : `${bakingTime} min`;
    console.log(`  ✓ ${recipe.name.padEnd(35)} → ${label}`);
    updated++;
  }

  console.log(`\n✅ Updated ${updated} recipes, ${skipped} skipped`);
}

main().catch(e => { console.error('Fatal:', e.message, e.data); process.exit(1); });
