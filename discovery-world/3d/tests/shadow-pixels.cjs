// Verify actual shadow pixels, not just enabled flags. Desktop/software WebGL.
const { build } = require('esbuild');
const { chromium } = require('playwright');
const http = require('node:http'), path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const bundle = await build({ stdin: { resolveDir: ROOT, contents: `
    import * as THREE from 'three';
    window.checkShadowPixels = () => {
      const r = new THREE.WebGLRenderer({ antialias: false }); r.setSize(128, 128);
      r.shadowMap.type = THREE.BasicShadowMap;
      const scene = new THREE.Scene(); scene.background = new THREE.Color('white');
      const sun = new THREE.DirectionalLight('white', 2); sun.position.set(-3, 7, 4); sun.castShadow = true;
      sun.shadow.mapSize.set(1536, 1536);
      Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
      sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
      scene.add(sun, sun.target, new THREE.HemisphereLight('white', '#777777', .3));
      const material = new THREE.MeshStandardMaterial({ color: '#dddddd', roughness: 1 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), material); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material); cube.position.y = .5; cube.castShadow = true; scene.add(cube);
      const camera = new THREE.PerspectiveCamera(45, 1, .1, 30); camera.position.set(4, 6, 7); camera.lookAt(0, .3, 0);
      const target = new THREE.WebGLRenderTarget(128, 128);
      function draw(enabled) {
        r.shadowMap.enabled = enabled; r.shadowMap.needsUpdate = true; r.setRenderTarget(target); r.render(scene, camera);
        const pixels = new Uint8Array(128 * 128 * 4); r.readRenderTargetPixels(target, 0, 0, 128, 128, pixels); return pixels;
      }
      const plain = draw(false), shadow = draw(true);
      let darker = 0, largest = 0;
      for (let i = 0; i < plain.length; i += 4) {
        const d = (plain[i] + plain[i + 1] + plain[i + 2] - shadow[i] - shadow[i + 1] - shadow[i + 2]) / 3;
        if (d > 20) darker++; largest = Math.max(largest, d);
      }
      const result = { darkerPixels: darker, largestDarkening: largest, width: sun.shadow.map.width, compare: sun.shadow.map.depthTexture.compareFunction, glError: r.getContext().getError() };
      sun.shadow.map.dispose(); target.dispose(); ground.geometry.dispose(); cube.geometry.dispose(); material.dispose(); r.dispose();
      return result;
    };
  ` }, bundle: true, minify: true, format: 'iife', write: false });
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<body><script src="/fixture.js"></script>'); }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    const pixels = await page.evaluate(() => checkShadowPixels());
    assert.deepEqual(errors, []); assert.equal(pixels.glError, 0);
    assert(pixels.darkerPixels > 50, 'basic shadows visibly darken rendered pixels');
    assert.equal(pixels.width, 1536); assert.equal(pixels.compare, null);
    console.log('PASS actual BasicShadowMap pixels:', JSON.stringify(pixels));
  } finally {
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
