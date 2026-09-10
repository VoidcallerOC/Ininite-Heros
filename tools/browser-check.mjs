import { spawn } from 'node:child_process';

const baseUrl = 'http://127.0.0.1:8080';
const pages = ['/', '/comics.html', '/cards.html', '/collectibles.html', '/about.html', '/visit.html'];
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9333', 'about:blank'], { stdio: 'ignore' });
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
  const events = [];
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
    } else if (message.method === 'Runtime.exceptionThrown') {
      events.push(`runtime: ${message.params.exceptionDetails.text || 'exception'}`);
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      events.push(`console: ${message.params.entry.text}`);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { socket, send, events };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Page evaluation failed');
  return result.result.value;
}

async function inspectPages(send, viewport) {
  await send('Emulation.setDeviceMetricsOverride', viewport);
  const results = [];
  for (const page of pages) {
    await send('Page.navigate', { url: `${baseUrl}${page}` });
    await delay(450);
    results.push(await evaluate(send, `({
      page: location.pathname,
      title: document.title,
      hasMain: Boolean(document.querySelector('main')),
      hasNav: Boolean(document.querySelector('#site-nav')),
      hasLogo: Boolean(document.querySelector('.brand img[src="assets/images/infinite-heroes-logo.webp"]')),
      imageCount: document.images.length,
      imagesLoaded: [...document.images].filter((image) => image.loading !== 'lazy').every((image) => image.complete && image.naturalWidth > 0),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    })`));
  }
  return results;
}

try {
  await waitForDebugEndpoint();
  const target = await createTarget(`${baseUrl}/`);
  const { socket, send, events } = await connect(target.webSocketDebuggerUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(250);
  const mobileMenu = await evaluate(send, `(() => {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.site-nav');
    const initiallyHidden = nav.getAttribute('aria-hidden') === 'true' && nav.hasAttribute('inert');
    toggle.click();
    const opened = toggle.getAttribute('aria-expanded') === 'true' && nav.classList.contains('is-open') && !nav.hasAttribute('inert');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const closed = toggle.getAttribute('aria-expanded') === 'false' && !nav.classList.contains('is-open') && nav.getAttribute('aria-hidden') === 'true' && nav.hasAttribute('inert');
    return { initiallyHidden, opened, closed, viewportWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, navLinks: [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href')) };
  })()`);

  const mobilePages = await inspectPages(send, { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const tabletPages = await inspectPages(send, { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
  const desktopPages = await inspectPages(send, { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const desktopNavigation = await evaluate(send, `(() => {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.menu-toggle');
    return { viewportWidth: window.innerWidth, navDisplay: getComputedStyle(nav).display, toggleDisplay: getComputedStyle(toggle).display, navAriaHidden: nav.getAttribute('aria-hidden'), navInert: nav.hasAttribute('inert') };
  })()`);

  const requiredTargets = ['index.html', 'comics.html', 'cards.html', 'collectibles.html', 'about.html', 'visit.html'];
  const pageResultsOk = (results) => results.every((page) => page.title && page.hasMain && page.hasNav && page.hasLogo && page.imageCount > 0 && page.imagesLoaded && page.scrollWidth <= page.clientWidth);
  const mobileMenuOk = mobileMenu.initiallyHidden && mobileMenu.opened && mobileMenu.closed && mobileMenu.viewportWidth === 390 && mobileMenu.scrollWidth <= mobileMenu.clientWidth && requiredTargets.every((targetName) => mobileMenu.navLinks.includes(targetName));
  const desktopNavigationOk = desktopNavigation.viewportWidth === 1440 && desktopNavigation.navDisplay !== 'none' && desktopNavigation.toggleDisplay === 'none' && desktopNavigation.navAriaHidden === null && !desktopNavigation.navInert;
  const result = { mobileMenuOk, mobilePagesOk: pageResultsOk(mobilePages), tabletPagesOk: pageResultsOk(tabletPages), desktopPagesOk: pageResultsOk(desktopPages), desktopNavigationOk, consoleOk: events.length === 0, consoleIssues: events, mobileMenu, desktopNavigation, mobilePages, tabletPages, desktopPages };

  console.log(JSON.stringify(result, null, 2));
  socket.close();
  chrome.kill();
  if (!result.mobileMenuOk || !result.mobilePagesOk || !result.tabletPagesOk || !result.desktopPagesOk || !result.desktopNavigationOk || !result.consoleOk) process.exit(1);
} catch (error) {
  chrome.kill();
  console.error(error.stack || error.message);
  process.exit(1);
}
