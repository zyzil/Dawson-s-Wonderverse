// Exercise the shipped physical-device check, including actual pixels and loss.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
async function main() {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/shadow-check.html') {
      res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(path.join(ROOT, 'shadow-check.html')));
    } else { res.writeHead(404); res.end(); }
  });
  let browser;
  try {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('dawsons-discovery-world-3d-v1', 'keep-progress'));
    for (const [size, method] of [[512, 'basic'], [1536, 'basic'], [1536, 'pcf']]) {
      const start = Date.now();
      await page.goto('http://127.0.0.1:' + server.address().port + `/shadow-check.html?size=${size}&method=${method}`);
      await page.waitForFunction(() => window.__shadowCheck?.report.gpuCompleted, null, { timeout: 30000 });
      const pixels = await page.evaluate(() => {
        const { renderer: r, scene, camera, sun, cube, report } = __shadowCheck;
        const old = r.getRenderTarget(), target = new (sun.shadow.map.constructor)(192, 128);
        cube.rotation.y = .4;
        function draw(shadows) {
          r.shadowMap.enabled = shadows; r.shadowMap.needsUpdate = true;
          // The scene is already running: explicitly invalidate the material
          // variants when disabling shadows for this pixel comparison.
          scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
          r.setRenderTarget(target); r.render(scene, camera);
          const pixels = new Uint8Array(192 * 128 * 4); r.readRenderTargetPixels(target, 0, 0, 192, 128, pixels); return pixels;
        }
        const plain = draw(false), shadow = draw(true); let darker = 0;
        for (let i = 0; i < plain.length; i += 4) if ((plain[i] + plain[i + 1] + plain[i + 2] - shadow[i] - shadow[i + 1] - shadow[i + 2]) / 3 > 20) darker++;
        r.setRenderTarget(old); target.dispose();
        return { darker, report, save: localStorage.getItem('dawsons-discovery-world-3d-v1'), width: r.domElement.width };
      });
      await page.screenshot({ path: path.join(ROOT, 'screenshots/shadow-check.jpg'), type: 'jpeg' });
      assert(pixels.darker > 50, 'shadow must visibly darken actual rendered pixels');
      assert.equal(pixels.width, 384, 'device pixel density must not increase this isolated workload');
      assert.equal(pixels.report.glError, 0); assert.equal(pixels.report.contextLost, false);
      assert.deepEqual(pixels.report.allocatedMap, [size, size]);
      assert.equal(pixels.report.method, method); assert.equal(pixels.save, 'keep-progress');
      console.log('PASS small scene actual shadow pixels:', JSON.stringify({ size, method, darker: pixels.darker, startupMs: Date.now() - start }));
    }
    await page.locator('#copy').click();
    assert(await page.locator('#reportDetails').getAttribute('open') !== null);
    assert.match(await page.locator('#report').innerText(), /"gpuCompleted": true/);
    await page.evaluate(() => __shadowCheck.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => window.__shadowCheck.report.contextLost);
    assert.match(await page.locator('#status').innerText(), /browser reset the graphics/);
    assert.doesNotMatch(await page.locator('#status').innerText(), /memory/);
    assert.equal(await page.evaluate(() => localStorage.getItem('dawsons-discovery-world-3d-v1')), 'keep-progress');
    assert.deepEqual(errors, []);
    console.log('PASS readable report, actual context-loss handling and save isolation');
    await ctx.close();
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
