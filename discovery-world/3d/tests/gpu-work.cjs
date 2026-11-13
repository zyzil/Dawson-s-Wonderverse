const { build } = require('esbuild'), { chromium } = require('playwright');
const http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
async function main() {
  const bundle = await build({ stdin: { resolveDir: path.resolve(__dirname, '..'), contents: `
    import * as THREE from 'three'; import { waitForGpu } from './src/gpu-work.js';
    window.run = async () => {
      const r = new THREE.WebGLRenderer(); r.setSize(32, 32);
      r.render(new THREE.Scene(), new THREE.PerspectiveCamera());
      await waitForGpu(r);
      const completion = !r.getContext().isContextLost();
      const pending = waitForGpu(r);
      r.getContext().getExtension('WEBGL_lose_context').loseContext();
      let reason = ''; try { await pending; } catch(e) { reason = e.message; }
      r.dispose(); return { completion, reason };
    };` }, bundle: true, minify: true, write: false });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<body><script>' + bundle.outputFiles[0].text + '</script>');
  });
  let browser;
  try {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const result = await page.evaluate(() => run());
    assert.equal(result.completion, true); assert.match(result.reason, /context lost/i);
    console.log('PASS actual GPU completion and cancellation when context is lost');
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
