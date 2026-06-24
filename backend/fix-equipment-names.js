const http = require('http');
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'localhost', port: 4000, path: `/api${path}`, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const r = http.request(opts, res => { let raw = ''; res.on('data', d => raw += d); res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } }); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
async function main() {
  const auth = await req('POST', '/auth/login', { email: 'admin@cakeerp.com', password: 'admin123' });
  const token = auth.access_token;
  const all = await req('GET', '/equipment', null, token);

  const fixes = {
    OFEN:         { name: 'Backofen',              notes: 'Aktuell 1 Ofen — Engpass bei gleichzeitigem Backen' },
    TIEFKUEHLER:  { name: 'Tiefkühlschrank', notes: null },
    KUEHLSCHRANK: { name: 'Kühlschrank',      notes: 'Für Crème-Desserts, Cheesecakes und Torten' },
  };

  for (const item of all) {
    const fix = fixes[item.type];
    if (fix) {
      const updated = await req('PATCH', `/equipment/${item.id}`, {
        type: item.type, name: fix.name, size: item.size, quantity: item.quantity,
        notes: fix.notes !== null ? fix.notes : (item.type === 'TIEFKUEHLER' && item.size === 'GROSS'
          ? 'Für Eis, Popsicles, Kulfi und gefrorene Desserts' : ''),
        isActive: item.isActive,
      }, token);
      console.log(`Fixed: ${updated.name} (${updated.size ?? updated.type})`);
    }
  }
}
main().catch(console.error);
