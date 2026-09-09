import { spawn } from 'node:child_process';

const baseUrl = 'http://127.0.0.1:8080';
const pages = ['/', '/comics.html', '/cards.html', '/collectibles.html', '/about.html', '/visit.html'];
const chrome = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9333', 'about:blank',
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDebugEndpoint() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:9333/json/version');
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('Chromium remote debugging endpoint did not start.');
}

async function createTarget(url) {
  const response = await fetch(`http://127.0.0.1:9333/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Unable to create browser target: ${response.status}`);
  return response.json();
}

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { socket, send };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Page evaluation failed');
  return result.result.value;
}

try {
  await waitForDebugEndpoint();
  const target = await createTarget(`${baseUrl}/`);
  const { socket, send } = await connect(target.webSocketDebuggerUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(250);

  const home = await evaluate(send, `(() => {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.site-nav');
    toggle.click();
    return {
      expanded: toggle.getAttribute('aria-expanded'),
      menuOpen: nav.classList.contains('is-open'),
      bodyLocked: document.body.classList.contains('menu-open'),
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      navLinks: [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href')),
    };
  })()`);

  const pageResults = [];
  for (const page of pages) {
    await send('Page.navigate', { url: `${baseUrl}${page}` });
    await delay(300);
    pageResults.push(await evaluate(send, `({
      page: location.pathname,
      title: document.title,
      hasMain: Boolean(document.querySelector('main')),
      hasNav: Boolean(document.querySelector('#site-nav')),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    })`));
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${baseUrl}/` });
  await delay(300);
  const desktop = await evaluate(send, `(() => {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.menu-toggle');
    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      navDisplay: getComputedStyle(nav).display,
      toggleDisplay: getComputedStyle(toggle).display,
      navLinks: [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    };
  })()`);

  const requiredTargets = ['index.html', 'comics.html', 'cards.html', 'collectibles.html', 'about.html', 'visit.html'];
  const navigationOk = home.expanded === 'true'
    && home.menuOpen
    && home.bodyLocked
    && home.viewportWidth === 390
    && home.scrollWidth <= home.clientWidth
    && requiredTargets.every((targetName) => home.navLinks.includes(targetName));
  const pagesOk = pageResults.every((page) => page.title && page.hasMain && page.hasNav && page.scrollWidth <= page.clientWidth);
  const desktopOk = desktop.viewportWidth === 1440
    && desktop.scrollWidth <= desktop.clientWidth
    && desktop.navDisplay !== 'none'
    && desktop.toggleDisplay === 'none'
    && requiredTargets.every((targetName) => desktop.navLinks.includes(targetName));

  console.log(JSON.stringify({ navigationOk, pagesOk, desktopOk, mobileMenu: home, desktopNavigation: desktop, pages: pageResults }, null, 2));
  socket.close();
  chrome.kill();
  if (!navigationOk || !pagesOk || !desktopOk) process.exit(1);
} catch (error) {
  chrome.kill();
  console.error(error.stack || error.message);
  process.exit(1);
}
