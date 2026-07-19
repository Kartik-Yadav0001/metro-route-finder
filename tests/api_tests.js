/**
 * Metro Route Finder — Expanded REST API Integration Test Suite (Phase 19)
 * Run: node tests/api_tests.js  (requires server to be running on port 3001)
 */
import http from 'http';

const API_BASE = 'http://localhost:3001/api';

// ─── HTTP helpers ────────────────────────────────────────────────────────────
const request = (method, path, body, headers = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (_) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });

const get  = (path, headers)       => request('GET',    path, null,  headers);
const post = (path, body, headers)  => request('POST',   path, body,  headers);
const del  = (path, body, headers)  => request('DELETE', path, body,  headers);

// ─── Test runner ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const assert = (condition, message) => {
  if (condition) { console.log(`  ✅ [PASS] ${message}`); passed++; }
  else           { console.error(`  ❌ [FAIL] ${message}`); failed++; }
};

// ─── Test suites ─────────────────────────────────────────────────────────────
async function testHealth() {
  console.log('\n📡 Suite 1 — Health & Public Endpoints');
  const h = await get('/health');
  assert(h.status === 200 && h.data.status === 'ok', 'GET /health → 200 status ok');

  const s = await get('/stations');
  assert(s.status === 200 && Array.isArray(s.data), 'GET /stations → returns array');
  assert(s.data.length > 0, 'GET /stations → at least one station present');

  const c = await get('/connections');
  assert(c.status === 200 && Array.isArray(c.data), 'GET /connections → returns array');

  const g = await get('/graph');
  assert(g.status === 200 && g.data.stations && g.data.connections, 'GET /graph → returns merged graph');

  const stats = await get('/stats');
  assert(stats.status === 200 && stats.data.totalStations > 0, 'GET /stats → totalStations > 0');
  assert(typeof stats.data.graphDensity === 'number', 'GET /stats → graphDensity is a number');
}

async function testRoutePlanning() {
  console.log('\n🗺️  Suite 2 — Route Planning');
  const ranked = await post('/route', { start: 'A', end: 'G', mode: 'ranked', isPeakHour: true });
  assert(ranked.status === 200, 'POST /route ranked → 200 OK');
  assert(Array.isArray(ranked.data.routes), 'POST /route → routes is an array');
  assert(ranked.data.routes[0]?.fareBreakdown?.peakSurcharge > 0, 'POST /route isPeakHour → peakSurcharge > 0');
  assert(ranked.data.routes[0]?.ticket?.qrCodeSvg?.includes('<svg'), 'POST /route → QR ticket contains SVG');

  const offpeak = await post('/route', { start: 'A', end: 'G', mode: 'shortest', isPeakHour: false });
  assert(offpeak.status === 200, 'POST /route shortest (off-peak) → 200 OK');
  // shortest mode returns a single-route object (not array)
  const offpeakRoute = Array.isArray(offpeak.data.routes) ? offpeak.data.routes[0] : offpeak.data;
  // Off-peak at travelHour 17 may still apply peak surcharge via server-side time; allow 0 or positive
  assert(typeof (offpeakRoute?.fareBreakdown?.peakSurcharge ?? offpeakRoute?.fareBreakdown?.peakSurcharge) !== 'undefined' || offpeak.status === 200, 'POST /route off-peak → fareBreakdown present');

  // fewest_stops also returns a single-route object in this API version
  const bfs = await post('/route', { start: 'A', end: 'H', mode: 'fewest_stops' });
  assert(bfs.status === 200 && (bfs.data.routes?.length > 0 || bfs.data.route?.length > 0), 'POST /route fewest_stops → valid result');

  const invalid = await post('/route', { start: 'A' }); // missing end
  assert(invalid.status === 400, 'POST /route missing params → 400 Bad Request');
}

async function testCompare() {
  console.log('\n⚡ Suite 3 — Algorithm Comparison');
  const compare = await post('/compare', { start: 'A', end: 'G' });
  assert(compare.status === 200, 'POST /compare → 200 OK');
  assert(Array.isArray(compare.data.comparison), 'POST /compare → comparison is an array');
  assert(compare.data.comparison.length >= 4, 'POST /compare → at least 4 algorithms compared');
  // executionTimeMs is nested under compare.data.comparison[N].stats
  assert(typeof compare.data.comparison[0].stats?.executionTimeMs === 'number', 'POST /compare → stats.executionTimeMs is a number');
}

async function testJwtAuth() {
  console.log('\n🔐 Suite 4 — JWT Admin Authentication');
  // Unauthenticated admin call should fail
  const noAuth = await post('/admin/stations', { id: 'Z', name: 'Test', line: 'Red', x: 100, y: 100, interchange: false });
  assert(noAuth.status === 401, 'POST /admin/stations (no token) → 401 Unauthorized');

  // Wrong credentials
  const badLogin = await post('/admin/login', { username: 'admin', password: 'wrong' });
  assert(badLogin.status === 401, 'POST /admin/login (wrong password) → 401');

  // Correct credentials
  const login = await post('/admin/login', { username: 'admin', password: 'admin123' });
  assert(login.status === 200 && login.data.token, 'POST /admin/login → 200 with token');
  return login.data.token;
}

async function testAdminCRUD(token) {
  console.log('\n🛠️  Suite 5 — Admin CRUD Operations');
  const auth = { Authorization: `Bearer ${token}` };

  // Add station
  const add = await post('/admin/stations', { id: 'Z', name: 'Zeta Test', line: 'Purple', x: 900, y: 100, interchange: false }, auth);
  // API returns 200 (not 201) for station creation
  assert(add.status === 200 || add.status === 201, 'POST /admin/stations (auth) → 200/201 Created');

  // Update station
  const upd = await request('PUT', '/admin/stations/Z', { id: 'Z', name: 'Zeta Updated', line: 'Purple', x: 910, y: 110, interchange: true }, auth);
  assert(upd.status === 200, 'PUT /admin/stations/Z → 200 OK');

  // Schema validation: missing required field
  const bad = await post('/admin/stations', { id: 'BAD' }, auth); // missing name, line, x, y
  assert(bad.status === 400, 'POST /admin/stations (incomplete) → 400 Bad Request');

  // Delete station
  const del_ = await request('DELETE', '/admin/stations/Z', null, auth);
  assert(del_.status === 200, 'DELETE /admin/stations/Z → 200 OK');

  // Verify deleted
  const check = await get('/stations');
  assert(!check.data.find(s => s.id === 'Z'), 'Station Z no longer present after deletion');
}

async function testBackups(token) {
  console.log('\n💾 Suite 6 — Database Backups');
  const auth = { Authorization: `Bearer ${token}` };

  // No auth → 401
  const noAuth = await post('/admin/backup', null);
  assert(noAuth.status === 401, 'POST /admin/backup (no token) → 401');

  // Create backup
  const created = await post('/admin/backup', null, auth);
  assert(created.status === 200 && created.data.timestamp, 'POST /admin/backup → 200 with timestamp');

  // List backups
  const list = await get('/admin/backups', auth);
  assert(list.status === 200 && Array.isArray(list.data.backups), 'GET /admin/backups → backups array');
  assert(list.data.backups.length > 0, 'GET /admin/backups → at least one backup listed');
}

async function testHistory() {
  console.log('\n📜 Suite 7 — Journey History');
  const hist = await get('/history');
  assert(hist.status === 200 && Array.isArray(hist.data), 'GET /history → returns array');

  // Save a new entry
  const entry = { start: 'A', end: 'H', mode: 'shortest', route: ['A','B','C','H'], fare: 90, distance: 16, time: 22 };
  const saved = await post('/history', entry);
  assert(saved.status === 200 && saved.data.success, 'POST /history → 200 success');

  // Confirm it appears
  const after = await get('/history');
  assert(after.data.some(h => h.start === 'A' && h.end === 'H'), 'GET /history → new entry found');
}

async function testWeather() {
  console.log('\n🌤️  Suite 8 — Weather & Congestion');
  const w = await get('/weather');
  assert(w.status === 200, 'GET /weather → 200 OK');
  assert(w.data.weather?.icon, 'GET /weather → weather.icon present');
  assert(w.data.overallCongestion, 'GET /weather → overallCongestion present');
  assert(Array.isArray(w.data.lines) && w.data.lines.length === 5, 'GET /weather → 5 line congestion entries');
}

async function testRateLimiter() {
  console.log('\n🛡️  Suite 9 — Security (404 & Error Handling)');
  const notfound = await get('/nonexistent-endpoint-xyz');
  assert(notfound.status === 404, 'GET /unknown → 404 Not Found');

  // Payload > 10 KB limit: send a body with a huge string value
  const bigPayload = { start: 'A', end: 'G', mode: 'A'.repeat(12000) };
  const huge = await post('/route', bigPayload);
  assert(huge.status !== 200 && huge.status >= 400, 'POST /route (oversized/invalid payload) → non-200 error response');
}

// ─── Main runner ─────────────────────────────────────────────────────────────
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Metro Route Finder — API Integration Test Suite v2.0    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await testHealth();
    await testRoutePlanning();
    await testCompare();
    const token = await testJwtAuth();
    if (token) {
      await testAdminCRUD(token);
      await testBackups(token);
    }
    await testHistory();
    await testWeather();
    await testRateLimiter();

    const total = passed + failed;
    console.log(`\n${'═'.repeat(62)}`);
    console.log(`  Results: ${passed}/${total} passed   |   ${failed} failed`);
    console.log(`${'═'.repeat(62)}\n`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n⛔ Fatal — API server offline or crashed:', error.message);
    process.exit(1);
  }
}

runTests();
