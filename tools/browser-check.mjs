import { spawn } from 'node:child_process';

const baseUrl = process.env.CMS_BROWSER_BASE_URL || 'http://127.0.0.1:3000';
const routes = ['/', '/comics.html', '/cards.html', '/collectibles.html', '/about.html', '/visit.html', '/admin/login'];
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9333', 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function debugEndpoint() {
  for (let i = 0; i < 40; i += 1) {
    try { if ((await fetch('http://127.0.0.1:9333/json/version')).ok) return; } catch {}
    await delay(100);
  }
  throw new Error('Chromium remote debugging endpoint did not start.');
}
async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:9333/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Unable to open browser target: ${response.status}`);
  return response.json();
}
async function connect(url) {
  const socket = new WebSocket(url); const pending = new Map(); let id = 0;
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); const waiter = pending.get(message.id); if (waiter) { pending.delete(message.id); message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result); } });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
  return { socket, send };
}
async function evaluate(send, expression) { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return result.result.value; }

try {
  await debugEndpoint();
  const target = await openTarget(`${baseUrl}/`);
  const { socket, send } = await connect(target.webSocketDebuggerUrl);
  await send('Page.enable');
  const results = [];
  for (const viewport of [{ name: 'mobile', width: 390, height: 844, mobile: true }, { name: 'tablet', width: 768, height: 1024, mobile: true }, { name: 'desktop', width: 1440, height: 900, mobile: false }]) {
    await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
    for (const route of routes) {
      await send('Page.navigate', { url: `${baseUrl}${route}` }); await delay(500);
      results.push(await evaluate(send, `({ viewport: ${JSON.stringify(viewport.name)}, path: location.pathname, title: document.title, hasMain: Boolean(document.querySelector('main')), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, loginLogoWidth: document.querySelector('.admin-login__logo') ? getComputedStyle(document.querySelector('.admin-login__logo')).width : null, overflow: [...document.querySelectorAll('body *')].filter((element) => element.scrollWidth > document.documentElement.clientWidth).slice(0, 4).map((element) => ({ tag: element.tagName, className: element.className, width: element.scrollWidth })), text: document.body.innerText })`));
    }
  }
  const publicRoutesOk = results.filter((page) => page.path !== '/admin/login').every((page) => page.hasMain && page.scrollWidth <= page.clientWidth);
  const login = results.filter((page) => page.path === '/admin/login');
  const loginOk = login.every((page) => page.hasMain && page.text.includes('Admin sign in') && page.scrollWidth <= page.clientWidth);
  console.log(JSON.stringify({ baseUrl, publicRoutesOk, loginOk, results: results.map(({ text, ...page }) => page) }, null, 2));
  socket.close(); chrome.kill();
  process.exit(publicRoutesOk && loginOk ? 0 : 1);
} catch (error) { chrome.kill(); console.error(error.stack || error.message); process.exit(1); }
