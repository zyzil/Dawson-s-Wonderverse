import * as THREE from 'three';

// Keep startup checks and all rehearsal draws on the exact same target setup.
export function makeWarmTarget(full) {
  return new THREE.WebGLRenderTarget(64, 32, full
    ? { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(64, 32), depthBuffer: true }
    : { type: THREE.HalfFloatType });
}

// Let one submitted batch finish before adding more startup work. No gl.finish
// or blocking polling: the browser remains responsive while the GPU catches up.
export function waitForGpu(renderer) {
  const gl = renderer.getContext(), canvas = renderer.domElement;
  return new Promise((resolve, reject) => {
    if (gl.isContextLost()) { reject(new Error('Graphics context lost')); return; }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) { reject(new Error('Could not create GPU completion fence')); return; }
    let frame;
    function finish(error) {
      cancelAnimationFrame(frame); canvas.removeEventListener('webglcontextlost', lost);
      if (!gl.isContextLost()) gl.deleteSync(sync);
      if (error) reject(error); else resolve();
    }
    function lost() { finish(new Error('Graphics context lost during startup draw')); }
    function poll() {
      if (gl.isContextLost()) { lost(); return; }
      const state = gl.clientWaitSync(sync, 0, 0);
      if (state === gl.WAIT_FAILED) { finish(new Error('GPU completion check failed')); return; }
      if (state === gl.ALREADY_SIGNALED || state === gl.CONDITION_SATISFIED) { finish(); return; }
      frame = requestAnimationFrame(poll);
    }
    canvas.addEventListener('webglcontextlost', lost, { once: true });
    gl.flush(); frame = requestAnimationFrame(poll);
  });
}
