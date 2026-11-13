// Real app regression tests: Android's light rendering is separate from ?test.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const PIXEL = 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';

async function main() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/game')) {
      res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(path.join(ROOT, 'index.html')));
    } else { res.writeHead(404); res.end(); }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    for (const [name, ua, query, safe] of [
      ['Android default', PIXEL, '', true],
      ['explicit safe mode', null, '?graphics=safe', true],
      ['Android full opt-in', PIXEL, '?graphics=full', false],
    ]) {
      const ctx = await browser.newContext({
        viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true,
        ...(ua ? { userAgent: ua } : {}),
      });
      await ctx.addInitScript(() => {
        // Old cached portraits can be valid PNGs yet contain no character.
        const c = document.createElement('canvas'); c.width = c.height = 1;
        window.__oldPortrait = c.toDataURL();
        localStorage.setItem('ddw3-portraits-b23', JSON.stringify({ pip: __oldPortrait, zuzu: __oldPortrait, jelly: __oldPortrait }));
        localStorage.setItem('dawsons-discovery-world-3d-v1', JSON.stringify({
          v: 1, creature: 'zuzu', x: 5, crown: true, wand: true, sound: true,
          pets: [{ col: 0, ears: 0, tail: 0, pat: 0 }], disc: ['tickle'], bits: [0],
        }));
        window.__speech = [];
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
          getVoices: () => [], addEventListener() {}, resume() {}, cancel() {},
          speak(u) { __speech.push(u.text); u.onstart?.(); u.onend?.(); },
          speaking: false, pending: false,
        } });
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const start = Date.now();
      await page.goto(base + '/game' + query, { timeout: 180000 });
      await page.waitForFunction(() => window.__DDW3 && document.getElementById('loading').classList.contains('done'), null, { timeout: 180000 });
      const images = await page.locator('.introPick img').evaluateAll(imgs => imgs.map(img => {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
        const p = g.getImageData(0, 0, 64, 64).data, colors = new Set();
        for (let i = 0; i < p.length; i += 4) colors.add([p[i], p[i + 1], p[i + 2], p[i + 3]].join(','));
        return { complete: img.complete, width: img.naturalWidth, old: img.src === __oldPortrait, colors: colors.size };
      }));
      assert.equal(images.length, 3);
      assert(images.every(i => i.complete && i.width === 256 && !i.old && i.colors > 100), 'three detailed, nonblank portraits replace the old cache');
      if (name === 'Android default') await page.screenshot({ path: path.join(ROOT, 'screenshots/android-title-safe.jpg'), type: 'jpeg' });
      await page.locator('#playBtn').tap();
      const report = await page.evaluate(() => {
        const D = __DDW3;
        const acceptedSpeech = D.G.voice.speak('Android voice regression check');
        D.save();
        const save = JSON.parse(localStorage.getItem('dawsons-discovery-world-3d-v1'));
        return {
          attributes: D.renderer.getContext().getContextAttributes(),
          shadow: D.renderer.shadowMap.enabled, post: D.post.enabled, postTarget: !!D.post.target,
          quality: D.quality(), acceptedSpeech, speech: __speech,
          save, selected: D.player.creature, introHidden: document.getElementById('overlay').classList.contains('hidden'),
          error: !document.getElementById('oops').hidden,
          fur: (() => { let n = 0; D.G.scene.traverse(o => { if (o.material?.userData?.layer) n++; }); return n; })(),
        };
      });
      assert.deepEqual(errors, []);
      assert.equal(report.error, false); assert.equal(report.introHidden, true);
      assert.equal(report.selected, 'zuzu');
      assert.equal(report.save.crown, true); assert.equal(report.save.wand, true);
      assert.equal(report.save.pets.length, 1); assert(report.save.bits.includes(0));
      assert(report.save.disc.includes('tickle'));
      assert.equal(report.acceptedSpeech, true);
      assert(report.speech.includes('Android voice regression check'), 'speech is not disabled by test mode');
      if (safe) {
        assert.equal(report.attributes.antialias, false);
        assert.equal(report.attributes.powerPreference, 'default');
        assert.equal(report.shadow, false); assert.equal(report.post, false);
        assert.equal(report.postTarget, false); assert.equal(report.fur, 0);
        assert.equal(report.quality, .4);
      } else {
        assert.equal(report.attributes.antialias, true);
        assert.equal(report.post, true); assert.equal(report.shadow, true);
      }
      // Both UI selection and the real controls continue to work.
      await page.locator('.creatureChoice[data-c="jelly"]').tap();
      assert.equal(await page.evaluate(() => __DDW3.player.creature), 'jelly');
      const box = await page.locator('#rightBtn').boundingBox();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }] });
      const x = await page.evaluate(() => __DDW3.player.x);
      await page.waitForFunction(x => __DDW3.player.x > x + 1, x, { timeout: 30000 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => Math.abs(__DDW3.camera.aspect - 390 / 844) < .01);
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForFunction(() => Math.abs(__DDW3.camera.aspect - 844 / 390) < .01);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(ROOT, 'screenshots/android-' + (safe ? 'safe' : 'full') + '.jpg'), type: 'jpeg' });
      console.log('PASS', name, JSON.stringify({ ms: Date.now() - start, portraits: images, shadow: report.shadow, post: report.post, fur: report.fur, speech: report.acceptedSpeech }));
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
