import * as THREE from 'three';
import { makeWarmTarget, waitForGpu } from './gpu-work.js';

// Use the game's actual light/map and canvas request. Initialize the map with
// two simple meshes on the canvas before switching to the real warmup target.
// Keep the map for gameplay; release only the temporary diagnostic scene.
export async function primeShadowMap({ renderer, sun, full, report, step }) {
  const check = report.preflight = { initialMapAllocated: !!sun.shadow.map, probes: [], stateRestored: false };
  const previousTarget = renderer.getRenderTarget(), auto = renderer.shadowMap.autoUpdate, needs = renderer.shadowMap.needsUpdate;
  const parent = sun.parent, targetParent = sun.target.parent;
  const position = sun.position.clone(), targetPosition = sun.target.position.clone();
  const scratch = new THREE.Scene(); scratch.name = 'shadow-preflight'; scratch.background = new THREE.Color('#e9dffa');
  const material = new THREE.MeshStandardMaterial({ color: '#ed599a', roughness: 1 });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material); cube.position.y = .5; cube.castShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), material); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const camera = new THREE.PerspectiveCamera(45, 1.5, .1, 30); camera.position.set(4, 6, 7); camera.lookAt(0, .3, 0);
  const rt = makeWarmTarget(full);
  try {
    step('Preflight: waiting for earlier startup GPU work');
    await waitForGpu(renderer);
    scratch.add(cube, floor, new THREE.HemisphereLight('white', '#777777', .3), sun, sun.target);
    sun.position.set(-3, 7, 4); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld();
    renderer.shadowMap.autoUpdate = false;
    for (const [name, target] of [['simple shadows on canvas', null], ['simple shadows in game warmup buffer', rt]]) {
      const probe = { name, completed: false, target: target ? { width: rt.width, height: rt.height,
        colorType: rt.texture.type, samples: rt.samples, depthTexture: !!rt.depthTexture } : 'canvas' };
      check.probes.push(probe); step('Preflight: ' + name);
      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(target); renderer.render(scratch, camera);
      renderer.setRenderTarget(previousTarget);
      await waitForGpu(renderer);
      probe.completed = true;
      probe.glError = renderer.getContext().getError();
      probe.mapSize = [sun.shadow.map.width, sun.shadow.map.height];
      probe.depthCompare = sun.shadow.map.depthTexture.compareFunction;
      if (probe.glError) throw new Error('Shadow preflight WebGL error ' + probe.glError);
    }
    check.mapRetained = true;
  } finally {
    // Retain the successfully initialized sun.shadow.map. Its next local draw
    // will update matrices/depth for the actual world rather than reallocate it.
    if (parent) parent.add(sun); else scratch.remove(sun);
    if (targetParent) targetParent.add(sun.target); else scratch.remove(sun.target);
    sun.position.copy(position); sun.target.position.copy(targetPosition); sun.target.updateMatrixWorld();
    renderer.shadowMap.autoUpdate = auto; renderer.shadowMap.needsUpdate = needs;
    renderer.setRenderTarget(previousTarget);
    cube.geometry.dispose(); floor.geometry.dispose(); material.dispose(); rt.dispose();
    check.stateRestored = sun.parent === parent && sun.target.parent === targetParent;
  }
}
