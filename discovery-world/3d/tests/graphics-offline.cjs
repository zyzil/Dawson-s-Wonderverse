// Opening the diagnostics page must not overwrite the cached offline game.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  // A frozen legacy fixture reproduces v2's all-navigation cache behavior.
  let legacy = true;
  const oldWorker = `
    const CACHE = 'dawsons-world-v2';
    self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting())));
    self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', e => {
      if (e.request.mode !== 'navigate') return;
      e.respondWith(fetch(e.request).then(async r => { const c = await caches.open(CACHE); await c.put('./index.html', r.clone()); return r; }).catch(() => caches.match('./index.html')));
    });
  `;
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const route = req.url.split('?')[0];
    const files = { '/sw.js': ['sw.js', 'text/javascript'], '/src/graphics.js': ['src/graphics.js', 'text/javascript'], '/graphics-tests.html': ['graphics-tests.html', 'text/html'] };
    if (route === '/sw.js' && legacy) { res.setHeader('Content-Type', 'text/javascript'); res.end(oldWorker); }
    else if (files[route]) { res.setHeader('Content-Type', files[route][1]); res.end(fs.readFileSync(path.join(ROOT, files[route][0]))); }
    else if (route === '/' || route === '/index.html') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<body><h1>Offline game fixture</h1><script>navigator.serviceWorker.register("/sw.js")</script>');
    } else { res.setHeader('Content-Type', 'text/plain'); res.end('fixture'); }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const ctx = await browser.newContext(), page = await ctx.newPage();
    await page.addInitScript(async () => {
      window.__controllerChanges = 0;
      navigator.serviceWorker.addEventListener('controllerchange', () => window.__controllerChanges++);
      const c = await caches.open('other-app-fixture'); await c.put('/unrelated', new Response('keep this'));
    });
    await page.goto(base + '/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert(await page.evaluate(() => caches.has('dawsons-world-v2')));
    assert(await page.evaluate(() => caches.has('other-app-fixture')));
    legacy = false;
    await page.goto(base + '/graphics-tests.html?build=37');
    await page.locator('[data-feature="power"]').waitFor();
    await page.waitForFunction(async () => await caches.has('dawsons-world-v3') && !await caches.has('dawsons-world-v2'));
    // Cache migration happens before clients.claim completes. Wait for the new
    // controller, not just the appearance of its cache, before going offline.
    await page.waitForFunction(() => window.__controllerChanges > 0 && navigator.serviceWorker.controller?.state === 'activated');
    assert.match(await page.evaluate(async () => {
      const c = await caches.open('dawsons-world-v3'); return (await c.match('./index.html')).text();
    }), /Offline game fixture/);
    assert(await page.evaluate(() => caches.has('other-app-fixture')));
    await ctx.setOffline(true);
    await page.goto(base + '/?graphics=safe');
    assert.equal(await page.locator('h1').innerText(), 'Offline game fixture');
    await page.goto(base + '/graphics-tests.html?build=37');
    await page.locator('[data-feature="power"]').waitFor();
    assert.equal(await page.locator('.check').count(), 7, 'offline checks and profile module are available');
    await ctx.setOffline(false);
    await ctx.close();
    console.log('PASS legacy helper upgrades from the checks page; offline game/check links and unrelated caches survive');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
