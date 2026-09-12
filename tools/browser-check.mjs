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
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const results = [];
  for (const route of routes) {
    await send('Page.navigate', { url: `${baseUrl}${route}` }); await delay(1200);
    results.push(await evaluate(send, `({ path: location.pathname, title: document.title, hasMain: Boolean(document.querySelector('main')), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, loginLogoWidth: document.querySelector('.admin-login__logo') ? getComputedStyle(document.querySelector('.admin-login__logo')).width : null, overflow: [...document.querySelectorAll('body *')].filter((element) => element.scrollWidth > document.documentElement.clientWidth).slice(0, 4).map((element) => ({ tag: element.tagName, className: element.className, width: element.scrollWidth })), text: document.body.innerText })`));
  }
  const publicRoutesOk = results.slice(0, 6).every((page) => page.hasMain && page.scrollWidth <= page.clientWidth && (page.text.includes('Content service setup required') || page.text.includes('Infinite Heroes Comics')));
  const login = results.at(-1);
  const loginOk = login?.hasMain && login?.text.includes('Admin sign in') && login?.scrollWidth <= login?.clientWidth;
  console.log(JSON.stringify({ baseUrl, publicRoutesOk, loginOk, results: results.map(({ text, ...page }) => page) }, null, 2));
  socket.close(); chrome.kill();
  if (!publicRoutesOk || !loginOk) process.exit(1);
} catch (error) { chrome.kill(); console.error(error.stack || error.message); process.exit(1); }
