// Real framebuffer/map reuse and cleanup tests for the canvas-first trial.
const { build } = require('esbuild'), { chromium } = require('playwright');
const http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
async function main() {
  const bundle = await build({ stdin: { resolveDir: path.resolve(__dirname, '..'), contents: `
    import * as THREE from 'three'; import { primeShadowMap } from './src/shadow-preflight.js';
    window.run = async (full, lose) => {
      const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); r.setSize(128, 96);
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.BasicShadowMap;
      const scene = new THREE.Scene(), sun = new THREE.DirectionalLight('white', 2);
      sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
      sun.position.set(12, 6, 8); sun.target.position.set(2, 0, 0); scene.add(sun, sun.target);
      Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
      const trace = [], render = r.render.bind(r); let firstMap;
      r.render = (s, c) => {
        const rt = r.getRenderTarget(); render(s,c);
        firstMap ||= sun.shadow.map;
        trace.push({ target: rt ? [rt.width, rt.height, rt.samples, !!rt.depthTexture] : 'canvas', sameMap: sun.shadow.map === firstMap });
        if (lose && rt) r.getContext().getExtension('WEBGL_lose_context').loseContext();
      };
      const report = {}, stages = []; let error = '';
      try { await primeShadowMap({ renderer: r, sun, full, report, step: s => stages.push(s) }); }
      catch(e) { error = e.message; }
      const result = { trace, report, stages, error,
        restored: sun.parent === scene && sun.target.parent === scene && sun.position.equals(new THREE.Vector3(12,6,8)) && sun.target.position.equals(new THREE.Vector3(2,0,0)) && r.getRenderTarget() === null && r.shadowMap.autoUpdate === true,
        keptMap: !!sun.shadow.map && sun.shadow.map === firstMap };
      sun.shadow.map?.dispose(); r.dispose(); return result;
    };` }, bundle: true, minify: true, write: false });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html'); res.end('<body><script>' + bundle.outputFiles[0].text + '</script>');
  });
  let browser;
  try {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage(); await page.goto('http://127.0.0.1:' + server.address().port);
    for (const [full, lose] of [[false, false], [true, false], [true, true]]) {
      const out = await page.evaluate(([full, lose]) => run(full, lose), [full, lose]);
      assert(out.restored && out.keptMap); assert.equal(out.report.preflight.stateRestored, true);
      assert.deepEqual(out.trace.map(x => x.target), ['canvas', [64, 32, full ? 4 : 0, full]]);
      assert(out.trace.every(x => x.sameMap));
      assert.equal(out.report.preflight.probes[0].completed, true);
      assert.equal(out.report.preflight.probes[1].completed, !lose);
      if (lose) assert.match(out.error, /context lost/i);
      else { assert.equal(out.error, ''); assert(out.report.preflight.probes.every(p => p.glError === 0)); }
      console.log('PASS actual canvas-first shadow map, target and state restoration:', JSON.stringify({ full, lose, trace: out.trace }));
    }
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
