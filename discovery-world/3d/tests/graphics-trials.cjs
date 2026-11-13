// Desktop / software WebGL tests for genuinely independent graphics trials.
const { chromium } = require('playwright');
const { build } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const PIXEL = 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';
const KEYS = ['resolution', 'shadows', 'scenery', 'fur', 'effects', 'antialias', 'power'];

async function main() {
  const source = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  const from = source.indexOf('function createRenderer(canvas) {');
  const to = source.indexOf('const renderer = createRenderer(canvas);', from);
  assert(from >= 0 && to > from);
  const bundle = await build({ stdin: { resolveDir: ROOT, contents:
    "import * as THREE from 'three'; import { SAFE_GRAPHICS, GRAPHICS, getGraphicsProfile } from './src/graphics.js';\n" +
    source.slice(from, to) + '\nwindow.createRenderer = createRenderer; window.getGraphicsProfile = getGraphicsProfile;',
  }, bundle: true, minify: true, format: 'iife', write: false });
  const files = {
    '/game': ['index.html', 'text/html'],
    '/graphics-tests.html': ['graphics-tests.html', 'text/html'],
    '/src/graphics.js': ['src/graphics.js', 'text/javascript'],
  };
  const server = http.createServer((req, res) => {
    const route = req.url.split('?')[0];
    if (route === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else if (route === '/fixture') { res.setHeader('Content-Type', 'text/html'); res.end('<body><canvas id="game"></canvas><script src="/fixture.js"></script>'); }
    else if (files[route]) { res.setHeader('Content-Type', files[route][1]); res.end(fs.readFileSync(path.join(ROOT, files[route][0]))); }
    else { res.writeHead(404); res.end(); }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const p = await browser.newPage();
    await p.goto(base + '/fixture');
    const profiles = await p.evaluate(({ keys, ua }) => {
      const output = {};
      for (const k of keys) output[k] = getGraphicsProfile('?graphics=safe&restore=' + k, ua);
      return { output, safe: getGraphicsProfile('', ua), full: getGraphicsProfile('?graphics=full', ua),
        shadowFree: getGraphicsProfile('?graphics=full-no-shadows&restore=shadows', ua),
        iphone: getGraphicsProfile('', 'iPhone'), unknown: getGraphicsProfile('?graphics=safe&restore=bogus', ua),
        combined: getGraphicsProfile('?graphics=safe&restore=fur,shadows,fur', ua) };
    }, { keys: KEYS, ua: PIXEL });
    for (const key of KEYS) {
      assert.equal(profiles.safe[key], false); assert.equal(profiles.full[key], true); assert.equal(profiles.iphone[key], true);
      assert.equal(profiles.shadowFree[key], key !== 'shadows', 'shadow-free preset must exclude only shadows, including with an extra restore request');
      for (const other of KEYS) assert.equal(profiles.output[key][other], other === key, key + ' must change only ' + key);
      assert.deepEqual(profiles.output[key].restored, [key]);
    }
    assert.deepEqual(profiles.unknown.restored, []);
    assert.deepEqual(profiles.combined.restored, ['shadows', 'fur']);
    console.log('PASS independent profile matrix, safe defaults, full defaults and valid feature filtering');
    await p.close();

    const hub = await browser.newPage();
    await hub.goto(base + '/graphics-tests.html');
    await hub.locator('[data-feature="power"]').waitFor();
    assert.equal(await hub.locator('.check').count(), 7);
    for (const key of KEYS) {
      const href = new URL(await hub.locator('[data-feature="' + key + '"] a').getAttribute('href'));
      assert.equal(href.searchParams.get('graphics'), 'safe');
      assert.equal(href.searchParams.get('restore'), key);
      assert.equal(href.searchParams.get('trial'), '1');
    }
    const saved = '{"v":1,"marker":"unchanged"}';
    await hub.evaluate(saved => localStorage.setItem('dawsons-discovery-world-3d-v1', saved), saved);
    await hub.getByLabel('Sharper picture result').selectOption('Worked');
    assert.equal(new URL(await hub.locator('#shadowFree').getAttribute('href'), base).searchParams.get('graphics'), 'full-no-shadows');
    await hub.getByLabel('Full detail without shadow maps result').selectOption('Worked');
    assert.equal(new URL(await hub.locator('#next').getAttribute('href')).searchParams.get('restore'), 'scenery');
    await hub.reload(); await hub.locator('[data-feature="power"]').waitFor();
    assert.equal(await hub.getByLabel('Sharper picture result').inputValue(), 'Worked');
    assert.equal(await hub.getByLabel('Full detail without shadow maps result').inputValue(), 'Worked');
    assert.equal(await hub.evaluate(() => localStorage.getItem('dawsons-discovery-world-3d-v1')), saved);
    await hub.locator('#copy').click();
    assert.match(await hub.locator('#summary').innerText(), /Sharper picture: Worked/);
    console.log('PASS test page links, next check, persistent results, export and game-save isolation');
    await hub.close();

    for (const key of ['antialias', 'power']) {
      const page = await browser.newPage();
      await page.goto(base + '/fixture?graphics=safe&restore=' + key);
      const failure = await page.evaluate(key => {
        const canvas = document.getElementById('game'), calls = [];
        canvas.getContext = (type, attrs) => {
          calls.push(attrs || null);
          canvas.dispatchEvent(new WebGLContextEvent('webglcontextcreationerror', { statusMessage: 'Rejected trial request' }));
          return null;
        };
        try { createRenderer(canvas); return { failed: false, calls }; }
        catch (e) { return { failed: true, calls, error: e.message }; }
      }, key);
      assert.equal(failure.failed, true); assert.match(failure.error, /Rejected trial request/);
      const explicit = failure.calls.filter(Boolean);
      assert.equal(explicit.length, 1, 'a trial must not fall back to a different request');
      assert.equal(explicit[0].antialias, key === 'antialias');
      assert.equal(explicit[0].powerPreference, key === 'power' ? 'high-performance' : 'default');
      console.log('PASS visible rejection without fallback:', key);
      await page.close();
    }

    const cases = ['baseline', ...KEYS, 'full-no-shadows'];
    const selected = process.env.GRAPHICS_CASES ? process.env.GRAPHICS_CASES.split(',') : cases;
    assert(selected.length && selected.every(k => cases.includes(k)), 'valid requested game scenarios');
    for (const key of cases.filter(k => selected.includes(k))) {
      const ctx = await browser.newContext({ userAgent: PIXEL, viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const query = new URLSearchParams({ graphics: 'safe', trial: '1' });
      if (key === 'full-no-shadows') query.set('graphics', key);
      else if (key !== 'baseline') query.set('restore', key);
      const start = Date.now();
      await page.goto(base + '/game?' + query, { timeout: 180000 });
      await page.waitForFunction(() => window.__DDW3 && document.getElementById('loading').classList.contains('done'), null, { timeout: 180000 });
      if (key === 'scenery' || key === 'full-no-shadows') await page.waitForFunction(() => __DDW3.LOWSTATS.hi > 0, null, { timeout: 30000 });
      await page.locator('#playBtn').tap();
      const actual = await page.evaluate(() => {
        const D = __DDW3, a = D.renderer.getContext().getContextAttributes();
        let fur = 0; D.G.scene.traverse(o => { if (o.material?.userData?.layer) fur++; });
        return { profile: D.graphics, resolution: D.quality() === .75, shadows: D.renderer.shadowMap.enabled,
          scenery: D.LOWSTATS.hi > 0, fur: fur > 0, effects: D.post.enabled, antialias: a.antialias,
          power: a.powerPreference === 'high-performance', pixelRatio: D.renderer.getPixelRatio(),
          oops: !document.getElementById('oops').hidden,
          pictures: [...document.querySelectorAll('.introPick img')].every(i => i.complete && i.naturalWidth === 256) };
      });
      for (const feature of KEYS) assert.equal(actual[feature], key === 'full-no-shadows' ? feature !== 'shadows' : feature === key, key + ': unexpected ' + feature);
      assert.equal(actual.pixelRatio, key === 'resolution' || key === 'full-no-shadows' ? 1.5 : .8);
      assert.equal(actual.profile.safe, true); assert.equal(actual.oops, false); assert.equal(actual.pictures, true);
      assert(await page.locator('.graphicsTrialBack').isVisible());
      assert.deepEqual(errors, []);
      if (key === 'full-no-shadows') {
        const guards = await page.evaluate(() => [5, 0].map(level => {
          const D = __DDW3; D.G.applyGfx(level);
          let casters = 0, maps = 0; D.G.scene.traverse(o => { if (o.isLight) { if (o.castShadow) casters++; if (o.shadow?.map) maps++; } });
          return { enabled: D.renderer.shadowMap.enabled, casters, maps };
        }));
        assert(guards.every(g => !g.enabled && g.casters === 0 && g.maps === 0), 'quality changes must not re-enable or allocate shadow maps');
      }
      console.log('PASS real game single feature:', key, JSON.stringify({ ms: Date.now() - start, ...actual }));
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
