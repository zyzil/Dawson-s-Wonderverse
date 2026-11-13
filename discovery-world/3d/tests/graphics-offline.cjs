// Opening the diagnostics page must not overwrite the cached offline game.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const server = http.createServer((req, res) => {
    const route = req.url.split('?')[0];
    const files = { '/sw.js': ['sw.js', 'text/javascript'], '/src/graphics.js': ['src/graphics.js', 'text/javascript'], '/graphics-tests.html': ['graphics-tests.html', 'text/html'] };
    if (files[route]) { res.setHeader('Content-Type', files[route][1]); res.end(fs.readFileSync(path.join(ROOT, files[route][0]))); }
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
      const c = await caches.open('other-app-fixture'); await c.put('/unrelated', new Response('keep this'));
    });
    await page.goto(base + '/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert(await page.evaluate(() => caches.has('other-app-fixture')));
    await page.goto(base + '/graphics-tests.html?build=37');
    await page.locator('[data-feature="power"]').waitFor();
    await ctx.setOffline(true);
    await page.goto(base + '/?graphics=safe');
    assert.equal(await page.locator('h1').innerText(), 'Offline game fixture');
    await page.goto(base + '/graphics-tests.html?build=37');
    await page.locator('[data-feature="power"]').waitFor();
    assert.equal(await page.locator('.check').count(), 7, 'offline checks and profile module are available');
    await ctx.setOffline(false);
    await ctx.close();
    console.log('PASS diagnostics navigation preserves offline game, offline check links work, unrelated caches survive');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
