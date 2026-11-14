// Compare startup and first-view shader coverage on old/new HTML over HTTP.
// Desktop/software rendering only; no inference about physical phone speed.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
async function main() {
  const files = process.argv.slice(2).map(f => path.resolve(f));
  assert(files.length, 'pass before/after HTML files');
  const server = http.createServer((req, res) => {
    const i = Number(req.url.split('?')[0].slice(1));
    if (!Number.isInteger(i) || !files[i]) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(files[i]));
  });
  let browser;
  try {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const [i, file] of files.entries()) {
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 17; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36' });
      const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      const start = Date.now();
      const query = new URLSearchParams({ graphics: 'full-basic-shadows' });
      if (process.env.SHADOW_CODE === 'receivers') query.set('shadowcode', 'receivers');
      if (process.env.BONES === 'uniform') query.set('bones', 'uniform');
      await page.goto('http://127.0.0.1:' + server.address().port + '/' + i + '?' + query, { timeout: 180000 });
      await page.waitForFunction(() => window.__DDW3 && document.getElementById('loading').classList.contains('done'), null, { timeout: 180000 });
      await page.locator('#playBtn').tap();
      const result = { file: path.basename(file), startupMs: Date.now() - start, views: {} };
      // Let the normal deferred model rehearsals complete before measuring
      // whether changing view introduces a new program.
      await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
      for (const [name, x] of [['park', 150], ['creatures', 230], ['castle', 392], ['house', 1008], ['castle rooms', 2010]]) {
        result.views[name] = await page.evaluate(async x => {
          const D = __DDW3, before = new Set(D.renderer.info.programs.map(p => p.cacheKey));
          const t0 = performance.now(); D.teleport(x);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
          const programs = D.renderer.info.programs;
          return { newPrograms: programs.filter(p => !before.has(p.cacheKey)).length,
            threeFramesMs: Math.round(performance.now() - t0), calls: D.info().calls, tris: D.info().tris };
        }, x);
      }
      assert.deepEqual(errors, []); console.log(JSON.stringify(result));
      await ctx.close();
    }
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
