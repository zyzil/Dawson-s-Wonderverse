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
      return { output, safe: getGraphicsProfile('?graphics=safe', ua), full: getGraphicsProfile('?graphics=full', ua),
        androidDefault: getGraphicsProfile('', ua),
        shadowFree: getGraphicsProfile('?graphics=full-no-shadows&restore=shadows', ua),
        basicShadows: getGraphicsProfile('?graphics=full-basic-shadows', ua),
        preflightShadows: getGraphicsProfile('?graphics=full-basic-shadows&preflight=1', ua),
        worldCheck: getGraphicsProfile('?graphics=full-basic-shadows&preflight=1&worldprobe=1', ua),
        noShadowPreflight: getGraphicsProfile('?graphics=full-no-shadows&preflight=1', ua),
        originalWarmup: getGraphicsProfile('?graphics=full-basic-shadows&warmup=original', ua),
        iphone: getGraphicsProfile('', 'iPhone'), unknown: getGraphicsProfile('?graphics=safe&restore=bogus', ua),
        combined: getGraphicsProfile('?graphics=safe&restore=fur,shadows,fur', ua) };
    }, { keys: KEYS, ua: PIXEL });
    for (const key of KEYS) {
      assert.equal(profiles.safe[key], false); assert.equal(profiles.full[key], true); assert.equal(profiles.iphone[key], true);
      assert.equal(profiles.shadowFree[key], key !== 'shadows', 'shadow-free preset must exclude only shadows, including with an extra restore request');
      assert.equal(profiles.androidDefault[key], key !== 'shadows', 'Android default must match the physically verified profile');
      assert.equal(profiles.basicShadows[key], true, 'basic-shadow trial restores every original graphics category');
      for (const other of KEYS) assert.equal(profiles.output[key][other], other === key, key + ' must change only ' + key);
      assert.deepEqual(profiles.output[key].restored, [key]);
    }
    assert.deepEqual(profiles.unknown.restored, []);
    assert.deepEqual(profiles.combined.restored, ['shadows', 'fur']);
    assert.equal(profiles.basicShadows.shadowType, 'basic');
    assert.equal(profiles.basicShadows.localShadowWarmup, true);
    assert.equal(profiles.originalWarmup.localShadowWarmup, false);
    assert.equal(profiles.androidDefault.localShadowWarmup, false);
    assert.equal(profiles.preflightShadows.shadowPreflight, true);
    assert.equal(profiles.basicShadows.shadowPreflight, false);
    assert.equal(profiles.worldCheck.worldShadowCheck, true);
    assert.equal(profiles.androidDefault.worldShadowCheck, false);
    assert.equal(profiles.preflightShadows.worldShadowCheck, false);
    assert.equal(profiles.noShadowPreflight.shadowPreflight, false);
    assert.equal(profiles.full.shadowType, 'pcf');
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
    assert.equal(new URL(await hub.locator('#preflightShadows').getAttribute('href'), base).searchParams.get('preflight'), '1');
    assert.equal(new URL(await hub.locator('#worldShadows').getAttribute('href'), base).searchParams.get('worldprobe'), '1');
    await hub.getByLabel('World shadow checks result').selectOption('Worked');
    assert.equal(new URL(await hub.locator('#next').getAttribute('href')).searchParams.get('restore'), 'scenery');
    await hub.reload(); await hub.locator('[data-feature="power"]').waitFor();
    assert.equal(await hub.getByLabel('Sharper picture result').inputValue(), 'Worked');
    assert.equal(await hub.getByLabel('Full detail without shadow maps result').inputValue(), 'Worked');
    assert.equal(await hub.getByLabel('World shadow checks result').inputValue(), 'Worked');
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

    // A normal Android URL may fall back when its preferred canvas request is
    // unsupported; an explicit restoration trial must still fail visibly.
    const fallback = await browser.newPage({ userAgent: PIXEL });
    await fallback.goto(base + '/fixture');
    const fallbackAttrs = await fallback.evaluate(() => {
      const canvas = document.getElementById('game'), original = canvas.getContext.bind(canvas);
      canvas.getContext = (type, attrs) => {
        if (!attrs || attrs.powerPreference === 'high-performance') return null;
        return original(type, attrs);
      };
      const r = createRenderer(canvas), a = r.getContext().getContextAttributes(); r.dispose(); return a;
    });
    assert.equal(fallbackAttrs.antialias, false); assert.equal(fallbackAttrs.powerPreference, 'default');
    await fallback.close();
    console.log('PASS default Android canvas fallback without weakening explicit trials');

    const cases = ['baseline', ...KEYS, 'full-no-shadows', 'android-default', 'full-basic-shadows', 'full-basic-preflight', 'full-basic-world'];
    const selected = process.env.GRAPHICS_CASES ? process.env.GRAPHICS_CASES.split(',') : cases;
    assert(selected.length && selected.every(k => cases.includes(k)), 'valid requested game scenarios');
    for (const key of cases.filter(k => selected.includes(k))) {
      const basicCase = key.startsWith('full-basic-');
      const ctx = await browser.newContext({ userAgent: PIXEL, viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        // Observe actual shadow-camera updates, not just app bookkeeping.
        Object.defineProperty(window, '__DDW3', { configurable: true, set(D) {
          Object.defineProperty(window, '__DDW3', { value: D, writable: true, configurable: true });
          window.__shadowViews = []; window.__preflightDraws = [];
          const render = D.renderer.render.bind(D.renderer);
          D.renderer.render = (scene, camera) => {
            const target = D.renderer.getRenderTarget();
            let sun; if (scene.name === 'shadow-preflight') scene.traverse(o => { if (o.isLight && o.castShadow) sun = o; });
            const beforeMap = sun?.shadow.map; render(scene, camera);
            if (sun) __preflightDraws.push({ target: target ? { width: target.width, height: target.height, samples: target.samples, depthTexture: !!target.depthTexture, colorType: target.texture.type } : 'canvas',
              mapPreviouslyAllocated: !!beforeMap, sameMap: !beforeMap || beforeMap === sun.shadow.map });
          };
          D.G.scene.traverse(o => {
            if (!o.isLight || !o.castShadow || !o.shadow) return;
            const update = o.shadow.updateMatrices.bind(o.shadow);
            o.shadow.updateMatrices = (...args) => {
              __shadowViews.push(o.shadow.camera.right - o.shadow.camera.left);
              return update(...args);
            };
          });
        } });
      });
      const query = new URLSearchParams({ graphics: 'safe', trial: '1' });
      if (key === 'android-default') { query.delete('graphics'); query.delete('trial'); }
      else if (basicCase) { query.set('graphics', 'full-basic-shadows'); if (key !== 'full-basic-shadows') query.set('preflight', '1'); if (key === 'full-basic-world') query.set('worldprobe', '1'); }
      else if (key === 'full-no-shadows') query.set('graphics', key);
      else if (key !== 'baseline') query.set('restore', key);
      const start = Date.now();
      await page.goto(base + '/game?' + query, { timeout: 180000 });
      await page.waitForFunction(() => window.__DDW3 && document.getElementById('loading').classList.contains('done'), null, { timeout: 180000 });
      if (basicCase || ['scenery', 'full-no-shadows', 'android-default'].includes(key)) await page.waitForFunction(() => __DDW3.LOWSTATS.hi > 0, null, { timeout: 30000 });
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
      const startupMs = Date.now() - start;
      const shadowFree = ['full-no-shadows', 'android-default'].includes(key);
      for (const feature of KEYS) assert.equal(actual[feature], basicCase || (shadowFree ? feature !== 'shadows' : feature === key), key + ': unexpected ' + feature);
      assert.equal(actual.pixelRatio, key === 'resolution' || shadowFree || basicCase ? 1.5 : .8);
      assert.equal(actual.profile.safe, true); assert.equal(actual.oops, false); assert.equal(actual.pictures, true);
      if (key === 'android-default') assert.equal(await page.locator('.graphicsTrialBack').count(), 0);
      else assert(await page.locator('.graphicsTrialBack').isVisible());
      assert.deepEqual(errors, []);
      if (shadowFree) {
        const guards = await page.evaluate(() => [5, 0].map(level => {
          const D = __DDW3; D.G.applyGfx(level);
          let casters = 0, maps = 0; D.G.scene.traverse(o => { if (o.isLight) { if (o.castShadow) casters++; if (o.shadow?.map) maps++; } });
          return { enabled: D.renderer.shadowMap.enabled, casters, maps };
        }));
        assert(guards.every(g => !g.enabled && g.casters === 0 && g.maps === 0), 'quality changes must not re-enable or allocate shadow maps');
      }
      if (basicCase) {
        const basic = await page.evaluate(() => {
          const D = __DDW3, maps = [], types = [], gl = D.renderer.getContext();
          D.G.scene.traverse(o => { if (o.isLight && o.castShadow && o.shadow?.map) {
            const m = o.shadow.map; maps.push({ width: m.width, height: m.height, compare: m.depthTexture.compareFunction, min: m.depthTexture.minFilter });
          } });
          for (const p of D.renderer.info.programs) {
            const n = gl.getProgramParameter(p.program, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p.program, i); if (u.name.includes('directionalShadowMap')) types.push(u.type); }
          }
          return { mode: D.renderer.shadowMap.type === D.THREE.BasicShadowMap, maps, types, sampler: gl.SAMPLER_2D, nearest: D.THREE.NearestFilter };
        });
        assert.equal(basic.mode, true); assert(basic.maps.length > 0);
        assert(basic.maps.every(m => m.width === 1536 && m.height === 1536 && m.compare === null && m.min === basic.nearest), 'change sampling method, not resolution');
        assert(basic.types.length > 0 && basic.types.every(t => t === basic.sampler), 'compiled shaders use plain depth samplers, not hardware comparison samplers');
        if (actual.profile.localShadowWarmup) {
          const warm = await page.evaluate(() => ({ metrics: __DDW3.G.shadowWarmup, views: __shadowViews, error: __DDW3.G.warmErr }));
          assert.equal(warm.error, undefined);
          assert.equal(warm.metrics.completedBatches, 16, 'all 16 submitted batches complete before play');
          assert.equal(warm.metrics.localPasses, 11);
          assert.equal(warm.metrics.wideShadowPasses, 0);
          assert(warm.views.length >= 11 && warm.views.every(w => w <= 26), 'actual depth passes never widen to whole-world bounds');
          console.log('PASS bounded shadow warmup:', JSON.stringify(warm));
        }
        if (actual.profile.shadowPreflight) {
          const check = await page.evaluate(() => ({ report: __DDW3.graphicsReport.preflight, draws: __preflightDraws, half: __DDW3.THREE.HalfFloatType }));
          assert.equal(check.report.initialMapAllocated, false, 'first shadow allocation must happen in the canvas check');
          assert.equal(check.report.stateRestored, true); assert.equal(check.report.mapRetained, true);
          assert(check.report.probes.length === 2 && check.report.probes.every(p => p.completed && p.glError === 0));
          assert.deepEqual(check.draws.map(d => d.target), ['canvas', { width: 64, height: 32, samples: 4, depthTexture: true, colorType: check.half }]);
          assert.deepEqual(check.draws.map(d => d.mapPreviouslyAllocated), [false, true]);
          assert(check.draws.every(d => d.sameMap));
          console.log('PASS actual canvas-first allocation and original HDR/MSAA/depth target:', JSON.stringify(check));
        }
        if (key === 'full-basic-world') {
          const check = await page.evaluate(() => __DDW3.graphicsReport.worldShadowCheck);
          assert(check.complete && check.stateRestored && check.probes.length >= 10);
          assert(check.probes.every(p => p.completed && p.glError === 0));
          assert(check.probes.filter(p => p.depthOnly).every(p => p.colorDraws === 0));
          assert(check.probes.filter(p => !p.depthOnly && !p.update).every(p => p.shadowDraws === 0));
          assert(check.probes.some(p => p.depthOnly && p.shadowDraws > 0));
          assert(check.probes.some(p => p.name === 'receive: fur' && p.receiverDraws > 0));
          assert.equal(check.probes.find(p => p.name === 'surfaces: shadow receiving off').receiverDraws, 0);
          assert(check.probes.some(p => p.name === 'combined: original world draw' && p.shadowDraws > 0 && p.colorDraws > 0));
          console.log('PASS actual world casting and receiver-group checks:', JSON.stringify(check));
        }
        console.log('PASS full-detail Basic startup:', startupMs);
        await page.screenshot({ path: path.join(ROOT, 'screenshots/android-basic-shadows.jpg'), type: 'jpeg', timeout: 120000 });
        console.log('PASS real shadow-map allocation and compiled sampler types:', JSON.stringify(basic));
        if (actual.profile.localShadowWarmup) {
          await page.evaluate(() => __DDW3.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
          await page.locator('#copyGraphicsReport').waitFor();
          await page.locator('#copyGraphicsReport').click();
          const report = JSON.parse(await page.locator('#graphicsReport').innerText());
          assert.equal(report.build, 44); assert.equal(report.contextLost, true);
          assert.equal(report.profile.shadowType, 'basic'); assert(report.lastSubmittedStage);
          console.log('PASS game context-loss report');
        }
      }
      console.log('PASS real game single feature:', key, JSON.stringify({ ms: startupMs, ...actual }));
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
