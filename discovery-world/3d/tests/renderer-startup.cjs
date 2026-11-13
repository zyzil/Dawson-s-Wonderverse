// Focused startup regression tests. Desktop Chromium / software WebGL only.
const { chromium } = require('playwright');
const { build } = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const source = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  const from = source.indexOf('function createRenderer(canvas) {');
  const to = source.indexOf('const renderer = createRenderer(canvas);', from);
  assert(from >= 0 && to > from, 'find the real startup helper');
  const bundle = await build({
    stdin: { contents: "import * as THREE from 'three';\nimport { SAFE_GRAPHICS } from './src/graphics.js';\n" + source.slice(from, to) +
      '\nwindow.createRenderer = createRenderer; window.THREE = THREE;', resolveDir: ROOT },
    bundle: true, minify: true, write: false, format: 'iife',
  });
  const server = http.createServer((req, res) => {
    const route = req.url.split('?')[0];
    const files = {
      '/baseline': path.join(ROOT, '../backups/3D_build35_index.html'),
      '/candidate': path.join(ROOT, 'index.html'),
    };
    if (route === '/renderer.js') {
      res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text);
    } else if (route === '/renderer') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<canvas id="game" width="32" height="32"></canvas><script src="/renderer.js"></script>');
    } else if (files[route]) {
      res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(files[route]));
    } else { res.writeHead(404); res.end(); }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    for (const mode of ['normal', 'antialias', 'default-probe', 'low-power-only', 'unavailable', 'unexpected', 'compatible']) {
      const page = await browser.newPage();
      await page.goto(url + '/renderer' + (mode === 'compatible' ? '?graphics=compatible' : ''));
      const result = await page.evaluate(mode => {
        const canvas = document.getElementById('game');
        const original = canvas.getContext.bind(canvas), calls = [];
        let adds = 0, removes = 0;
        const add = canvas.addEventListener.bind(canvas), remove = canvas.removeEventListener.bind(canvas);
        canvas.addEventListener = (type, ...args) => { if (type === 'webglcontextcreationerror') adds++; return add(type, ...args); };
        canvas.removeEventListener = (type, ...args) => { if (type === 'webglcontextcreationerror') removes++; return remove(type, ...args); };
        canvas.getContext = (type, attrs) => {
          calls.push({ type, attrs });
          if (mode === 'unexpected') throw Error('sentinel renderer failure');
          const reject = mode === 'unavailable' || (mode === 'antialias' && attrs?.antialias !== false) ||
            (mode === 'default-probe' && attrs?.antialias === true) ||
            (mode === 'low-power-only' && attrs?.powerPreference !== 'low-power');
          if (reject) {
            canvas.dispatchEvent(new WebGLContextEvent('webglcontextcreationerror', { statusMessage: 'Simulated GPU rejection' }));
            return null;
          }
          return original(type, attrs);
        };
        try {
          const r = createRenderer(canvas), t = window.THREE;
          r.setSize(32, 32, false);
          const scene = new t.Scene(); scene.background = new t.Color('red');
          r.render(scene, new t.PerspectiveCamera());
          const gl = r.getContext(), pixel = new Uint8Array(4);
          gl.readPixels(16, 16, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          const attributes = gl.getContextAttributes(); r.dispose();
          return { ok: true, pixel: [...pixel], attributes, calls, adds, removes };
        } catch (e) { return { ok: false, error: e.message, calls, adds, removes }; }
      }, mode);
      assert(result.calls.every(c => c.type === 'webgl2'));
      if (mode === 'unavailable' || mode === 'unexpected') {
        assert.equal(result.ok, false);
        assert.equal(result.adds, result.removes, 'remove failed startup listeners');
        if (mode === 'unavailable') {
          assert.match(result.error, /WebGL 2 could not start/);
          assert.match(result.error, /Simulated GPU rejection/);
          assert(result.calls.some(c => c.attrs?.powerPreference === 'low-power'));
        } else {
          assert.match(result.error, /sentinel renderer failure/);
          assert.equal(result.calls.length, 1, 'do not retry unrelated errors');
        }
      } else {
        assert.equal(result.ok, true, result.error);
        assert.deepEqual(result.pixel, [255, 0, 0, 255], 'render real pixels');
        if (mode === 'normal') {
          assert.equal(result.calls.length, 1);
          assert.equal(result.attributes.antialias, true);
          assert.equal(result.attributes.powerPreference, 'high-performance');
        } else if (mode !== 'default-probe') assert.equal(result.attributes.antialias, false);
        if (mode === 'compatible') {
          assert.equal(result.calls.length, 1);
          assert.equal(result.attributes.powerPreference, 'default');
        }
      }
      console.log('PASS renderer:', mode);
      await page.close();
    }
    const scenarios = [
      ['baseline', '/baseline?test', false],
      ['candidate', '/candidate?test', false],
      ['compatible', '/candidate?test&graphics=compatible', false],
      ['GPU rejects antialiasing', '/candidate?test', true],
      ['compatible with full effects', '/candidate?graphics=compatible', false],
    ];
    for (const [name, route, rejectAA] of scenarios) {
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      if (rejectAA) await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attrs) {
          if (this.id === 'game' && type === 'webgl2' && attrs?.antialias !== false) return null;
          return original.call(this, type, attrs);
        };
      });
      const start = Date.now();
      await page.goto(url + route, { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => window.__DDW3 && document.getElementById('loading').classList.contains('done'), null, { timeout: 180000 });
      await page.locator('#playBtn').tap();
      assert(await page.locator('#overlay').evaluate(el => el.classList.contains('hidden')));
      const data = await page.evaluate(() => ({
        attributes: __DDW3.renderer.getContext().getContextAttributes(),
        errorVisible: !document.getElementById('oops').hidden,
        calls: __DDW3.info().calls,
      }));
      assert.equal(data.errorVisible, false);
      assert.deepEqual(errors, []);
      if (rejectAA || route.includes('graphics=compatible')) assert.equal(data.attributes.antialias, false);
      console.log('PASS game:', name, JSON.stringify({ startupMs: Date.now() - start, ...data }));
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
