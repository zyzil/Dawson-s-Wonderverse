// A physical-device diagnostic, deliberately independent of game assets,
// post-processing, PMREM and all-world warmup. No game storage or telemetry.
import * as THREE from 'three';

const $ = id => document.getElementById(id), canvas = $('sample');
const params = new URLSearchParams(location.search);
const size = params.get('size') === '1536' ? 1536 : 512;
const method = params.get('method') === 'pcf' ? 'pcf' : 'basic';
const report = { build: 41, three: THREE.REVISION, method, mapSize: size,
  userAgent: navigator.userAgent, stage: 'Creating WebGL 2 context', frames: 0,
  gpuCompleted: false, contextLost: false };
let renderer, sync, animation, stopped = false;
const update = () => { $('report').textContent = JSON.stringify(report, null, 2); };
function fail(message) {
  stopped = true; cancelAnimationFrame(animation);
  report.error = message; $('status').textContent = message; $('reportDetails').open = true; update();
}
$('settings').textContent = `${size} × ${size} shadow map · ${method === 'basic' ? 'basic sampling' : 'filtered PCF sampling'} · fixed 384 × 256 picture`;
canvas.addEventListener('webglcontextcreationerror', e => { report.creationDetail = e.statusMessage || ''; update(); });
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault(); report.contextLost = true;
  report.lossDetail = e.statusMessage || '(browser supplied no reason)';
  fail('The browser reset the graphics during this small check. Copy the report below. If graphics stay blocked, force-stop Chrome before reopening.');
});
$('copy').onclick = async () => {
  update(); $('reportDetails').open = true;
  try { await navigator.clipboard.writeText($('report').textContent); $('notice').textContent = 'Copied. Paste the report into the chat and say whether the shadow was visible.'; }
  catch { $('notice').textContent = 'Copy the technical report shown below and say whether the shadow was visible.'; }
};
if (navigator.userAgentData?.getHighEntropyValues) {
  navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'fullVersionList'])
    .then(data => { report.browser = data; update(); }).catch(() => {});
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'default' });
  renderer.setPixelRatio(1); renderer.setSize(384, 256, false);
  renderer.shadowMap.type = method === 'basic' ? THREE.BasicShadowMap : THREE.PCFShadowMap;
  const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
  report.webgl = gl.getParameter(gl.VERSION);
  report.renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  report.vendor = debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
  report.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  report.contextAttributes = gl.getContextAttributes();

  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9dffa');
  const sun = new THREE.DirectionalLight('white', 2.5); sun.position.set(-3, 7, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(size, size);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target, new THREE.HemisphereLight('white', '#777777', .3));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: '#ddd4e8', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: '#ed599a', roughness: .8 }));
  cube.position.y = .6; cube.castShadow = true; scene.add(cube);
  const camera = new THREE.PerspectiveCamera(45, 1.5, .1, 30); camera.position.set(4, 5, 7); camera.lookAt(0, .3, 0);

  function frame(time) {
    if (stopped) return;
    try {
      let completedNow = false;
      cube.rotation.y = time * .0003;
      // Submit a plain picture first, then the first shadow draw on the next
      // animation frame. Report the last submission, not an assumed GPU cause.
      renderer.shadowMap.enabled = report.frames > 0;
      if (report.frames === 1) { floor.material.needsUpdate = true; cube.material.needsUpdate = true; }
      if (!report.gpuCompleted) report.stage = renderer.shadowMap.enabled ? 'Submitting shadow draw' : 'Submitting draw without shadows';
      renderer.render(scene, camera); report.frames++;
      if (renderer.shadowMap.enabled && !sync && !report.gpuCompleted && !gl.isContextLost()) {
        report.stage = 'Waiting for first shadow draw to finish on GPU';
        sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
        if (!sync) throw new Error('Could not create GPU completion fence');
      }
      if (sync && !gl.isContextLost()) {
        const state = gl.clientWaitSync(sync, 0, 0);
        if (state === gl.WAIT_FAILED) throw new Error('GPU completion check failed');
        if (state === gl.ALREADY_SIGNALED || state === gl.CONDITION_SATISFIED) {
          gl.deleteSync(sync); sync = null;
          report.gpuCompleted = true; completedNow = true; report.stage = 'Shadow draw completed on GPU'; report.glError = gl.getError();
          report.allocatedMap = [sun.shadow.map.width, sun.shadow.map.height];
          report.depthType = sun.shadow.map.depthTexture.type;
          report.depthCompare = sun.shadow.map.depthTexture.compareFunction;
          $('status').textContent = 'The shadow draw completed. Is the block moving, with a dark shadow on the floor?';
        }
      }
      if (report.frames < 4 || report.frames % 30 === 0 || completedNow) update();
      animation = requestAnimationFrame(frame);
    } catch (e) { fail(e.message); }
  }
  // Browser tests can inspect real rendered pixels and deliberately lose the
  // context; this hook is never called by the page's normal flow.
  window.__shadowCheck = { renderer, scene, camera, sun, cube, report };
  update(); animation = requestAnimationFrame(frame);
} catch (e) { fail('WebGL 2 could not start: ' + (report.creationDetail || e.message)); }
