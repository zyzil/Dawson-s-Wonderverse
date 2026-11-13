// Offline asset generation from the game's own 3D character models.
// CHROMIUM_PATH=/usr/bin/chromium node tools/render_portraits.cjs
const { build } = require('esbuild');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const result = await build({ stdin: { resolveDir: path.join(ROOT, 'src'), contents: `
    import * as THREE from 'three';
    import { makeCreature } from './creatures.js';
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(256, 256); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .95;
    document.body.appendChild(renderer.domElement);
    window.drawPortrait = kind => {
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#fff6ee');
      scene.add(new THREE.HemisphereLight('#ffffff', '#c9a6ff', 1.4));
      const light = new THREE.DirectionalLight('#fff', 2); light.position.set(2, 4, 5); scene.add(light);
      const character = makeCreature(kind); scene.add(character.root);
      character.update(.016, { grounded: true, facing: 1, vx: 0, vy: 0 }); character.root.rotation.y = .35;
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(character.root), center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()), distance = Math.max(size.x, size.y) / (2 * Math.tan(Math.PI / 12)) * 1.15 + size.z / 2;
      const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
      camera.position.set(center.x, center.y, center.z + distance); camera.lookAt(center);
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    };
  ` }, bundle: true, minify: true, write: false, format: 'iife', loader: { '.glb': 'binary', '.jpg': 'dataurl' } });
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/bundle.js')) {
      res.setHeader('Content-Type', 'text/javascript'); res.end(result.outputFiles[0].text);
    } else {
      res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><body><script src="/bundle.js"></script></body>');
    }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('Portrait page:', error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/?test');
    await page.waitForFunction(() => !!window.drawPortrait);
    for (const kind of ['pip', 'zuzu', 'jelly']) {
      const url = await page.evaluate(kind => drawPortrait(kind), kind);
      const file = path.join(ROOT, 'src/assets/portrait-' + kind + '.png');
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log('Rendered', path.relative(ROOT, file));
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
