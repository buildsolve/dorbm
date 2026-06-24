// Clears tasks from KW 27-53 so planners fill them in week by week.
// The dotted target line on the dashboard still shows the 80% goal.
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
  const plans = await req('GET', '/weekly/plans', null, token);
  const tooClear = plans.filter(p => p.year === 2026 && p.weekNumber >= 27);
  console.log(`Clearing tasks from ${tooClear.length} plans (KW 27-53)...`);
  for (const plan of tooClear) {
    await req('DELETE', `/weekly/plans/${plan.id}/tasks`, null, token);
    process.stdout.write(`  KW ${plan.weekNumber} cleared\n`);
  }
  console.log('Done — plans are empty, target line still shows on dashboard.');
}
main().catch(console.error);
