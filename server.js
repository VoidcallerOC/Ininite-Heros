import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);
const dataDir = path.join(root, 'data');
const uploadDir = path.join(root, 'uploads');
const contentFile = path.join(dataDir, 'content.json');
const sessionSecret = process.env.ADMIN_SESSION_SECRET || 'change-this-session-secret';
const adminPassword = process.env.ADMIN_PASSWORD || 'infinite-heroes-admin';
const adminEnabled = process.env.ADMIN_ENABLED === 'true';
const sessions = new Map();
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
const defaults = {
  content: {
    'home.heroTitle': 'A comic shop worth the stop.', 'home.heroCopy': 'New issues, wall books, collectibles, and a counter where someone can point you to the next great read.',
    'comics.heroTitle': 'Comics live here.', 'comics.heroCopy': 'Wednesday new comics, DC and Marvel runs, and the books that stay on the wall.',
    'collectibles.heroTitle': 'Bring fandom home.', 'collectibles.heroCopy': 'Figures and statues next to the comics — pieces you can take off the shelf.',
    'about.heroTitle': 'Built for the love of comics.', 'about.heroCopy': 'An independent shop run by someone who already spent a career inside the books.',
    'visit.heroTitle': '1098 Main Street.', 'visit.heroCopy': 'Watertown’s comic shop. Hours on this page. A phone that rings the counter.',
    'home.announcement': '', 'comics.description': 'The weekly drop, the big two, and longer reads for the wall.', 'collectibles.description': 'Figures, statues, and pieces that make the display.', 'about.description': 'An independent shop with a long memory.',
    'store.address': '1098 Main St, Watertown, CT 06795', 'store.phone': '860-417-2559', 'store.email': 'paul@infiniteheroes.net', 'store.hours': 'Monday: Closed\nTuesday: 11 AM–4 PM\nWed–Sat: 11 AM–7 PM\nSunday: 12 PM–5 PM'
  },
  socials: { facebook: '', instagram: '' },
  images: {}
};
function readData() { try { return { ...defaults, ...JSON.parse(fs.readFileSync(contentFile, 'utf8')) }; } catch { return defaults; } }
function writeData(data) { fs.writeFileSync(contentFile, JSON.stringify(data, null, 2) + '\n'); }
if (!fs.existsSync(contentFile)) writeData(defaults);
function json(res, status, body) { const out = JSON.stringify(body); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(out); }
function cookie(name, value, maxAge = 86400) { return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax`; }
function isAdmin(req) { const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('ih_admin='))?.split('=')[1]; return token && sessions.has(token); }
function safeName(name) { return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-'); }
function serve(req, res, pathname) {
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  const full = path.resolve(root, file);
  if (!full.startsWith(root) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) return json(res, 404, { error: 'Not found' });
  const ext = path.extname(full); const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }); fs.createReadStream(full).pipe(res);
}
function body(req) { return new Promise((resolve, reject) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { reject(new Error('Invalid JSON')); } }); }); }
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if ((url.pathname === '/admin.html' || url.pathname.startsWith('/api/admin/')) && !adminEnabled) return json(res, 404, { error: 'Not found' });
    if (url.pathname === '/api/content' && req.method === 'GET') return json(res, 200, readData());
    if (url.pathname === '/api/admin/login' && req.method === 'POST') { const b = await body(req); if (b.password !== adminPassword) return json(res, 401, { error: 'Invalid password' }); const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, Date.now()); res.setHeader('Set-Cookie', cookie('ih_admin', token)); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/admin/logout' && req.method === 'POST') { res.setHeader('Set-Cookie', cookie('ih_admin', '', 0)); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/admin/content' && req.method === 'GET') { if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' }); return json(res, 200, readData()); }
    if (url.pathname === '/api/admin/content' && req.method === 'PUT') { if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' }); const b = await body(req); const current = readData(); writeData({ ...current, content: { ...current.content, ...(b.content || {}) }, socials: { ...current.socials, ...(b.socials || {}) }, images: { ...current.images, ...(b.images || {}) } }); return json(res, 200, readData()); }
    if (url.pathname === '/api/admin/upload' && req.method === 'POST') { if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' }); const b = await body(req); if (!b.name || !b.data) return json(res, 400, { error: 'File name and data are required' }); const ext = path.extname(safeName(b.name)).toLowerCase(); if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return json(res, 400, { error: 'Unsupported image type' }); const filename = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`; fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(b.data, 'base64')); return json(res, 201, { url: `/uploads/${filename}` }); }
    if (url.pathname === '/api/admin/analytics' && req.method === 'GET') { if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' }); const file = path.join(dataDir, 'analytics.json'); const a = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : { totalVisitors: 0, totalPageViews: 0, days: {} }; return json(res, 200, a); }
    if (url.pathname === '/api/track' && req.method === 'POST') { const file = path.join(dataDir, 'analytics.json'); const a = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : { totalVisitors: 0, totalPageViews: 0, days: {} }; const day = new Date().toISOString().slice(0, 10); a.totalPageViews++; a.days[day] ||= { visitors: 0, views: 0 }; a.days[day].views++; const visitor = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'; const key = crypto.createHash('sha256').update(`${visitor}:${day}:${sessionSecret}`).digest('hex'); if (!a.days[day].keys?.includes(key)) { a.days[day].keys ||= []; a.days[day].keys.push(key); a.days[day].visitors++; a.totalVisitors++; } fs.writeFileSync(file, JSON.stringify(a, null, 2)); return json(res, 204, {}); }
    if (url.pathname.startsWith('/uploads/')) return serve(req, res, url.pathname);
    return serve(req, res, url.pathname);
  } catch (error) { return json(res, 500, { error: error.message }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Infinite Heroes server listening on ${port}`));
