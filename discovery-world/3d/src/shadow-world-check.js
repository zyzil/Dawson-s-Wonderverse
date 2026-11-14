import * as THREE from 'three';
import { waitForGpu } from './gpu-work.js';

const materials = o => (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean);
const shape = o => o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'instanced' : 'static';
const casterGroup = o => shape(o) + (materials(o).some(m => m.alphaTest > 0 || m.displacementMap) ? ' cutout/displaced' : ' opaque');
function receiverGroup(o) {
  const ms = materials(o);
  if (ms.some(m => m.userData.layer != null)) return 'fur';
  if (o.isSkinnedMesh) return 'skinned bodies';
  if (o.isInstancedMesh) return 'instanced scenery';
  if (ms.some(m => m.isShaderMaterial || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile)) return 'custom surface shaders';
  if (ms.some(m => m.isMeshPhysicalMaterial)) return 'physical surfaces';
  return 'standard surfaces';
}

// Diagnostic only. Shadow-camera layer 1 already makes depth casting independent
// of the main camera in r187. Use an unused main-camera layer to submit genuine
// world shadow casters with NO world color draws, then test the original surface
// shaders with the depth map frozen. Keep original materials and light casting
// flags. In receiver-only mode the renderer selects the matching compiled variant.
export async function checkWorldShadows({ renderer, scene, camera, sun, target, report, step, view }) {
  const location = view ? { ...view, aspect: camera.aspect } : { cameraPosition: camera.position.toArray(), aspect: camera.aspect };
  const check = report.worldShadowCheck = { view: location, probes: [], complete: false, stateRestored: false };
  const receiverOnly = renderer.shadowMap.receiverOnly === true;
  check.receiverOnlyPrograms = receiverOnly;
  const history = { view: location, complete: false, completedProbes: 0, stateRestored: false };
  (report.worldShadowChecks ||= []).push(history);
  const objects = new Map(), lights = new Map();
  const previousTarget = renderer.getRenderTarget(), auto = renderer.shadowMap.autoUpdate, needs = renderer.shadowMap.needsUpdate;
  const infoAuto = renderer.info.autoReset, shadowCamera = camera.clone();
  let activeProbe;
  function refresh() {
    scene.traverse(o => {
      if (o.isLight && !lights.has(o)) lights.set(o, o.layers.mask);
      if (!o.material || objects.has(o)) return;
      const saved = { cast: o.castShadow, receive: o.receiveShadow, before: o.onBeforeShadow, beforeRender: o.onBeforeRender, afterRender: o.onAfterRender };
      objects.set(o, saved);
      if (saved.cast) o.onBeforeShadow = function (...args) {
        if (activeProbe) activeProbe.shadowDraws++;
        return saved.before.apply(this, args);
      };
      o.onBeforeRender = function (...args) {
        const result = saved.beforeRender.apply(this, args);
        if (activeProbe && this.receiveShadow) activeProbe.receiverDraws++;
        return result;
      };
      if (receiverOnly) o.onAfterRender = function (...args) {
        // Metadata for the selected program; no extra GPU queries per draw.
        if (activeProbe) {
          const props = renderer.properties.get(args[4]);
          if (props.surfaceShadowEnabled === true) activeProbe.shadowFeatureDraws++;
          if (renderer.uniformBones === true && this.isSkinnedMesh) {
            if (props.uniformBoneCount > 0) activeProbe.uniformBoneDraws++;
            else activeProbe.textureBoneDraws++;
            activeProbe.maxRigBones = Math.max(activeProbe.maxRigBones, this.skeleton.bones.length);
          }
        }
        return saved.afterRender.apply(this, args);
      };
    });
  }
  refresh();
  // Reserve a layer unused by world geometry; preserve every original mask.
  const layer = [30, 29, 28].find(n => {
    let occupied = false; scene.traverse(o => { if (o.layers.mask & (1 << n)) occupied = true; }); return !occupied;
  });
  try {
    if (layer == null || !(sun.shadow.camera.layers.mask & 0xFFFFFFFE)) throw new Error('Independent shadow-camera layers are required for this check');
    check.diagnosticLayer = layer;
    shadowCamera.layers.set(layer);
    renderer.shadowMap.autoUpdate = false; renderer.info.autoReset = false;
    async function draw(name, { depthOnly = false, castGroup = null, receiveGroup = null, allReceivers = false, update = false } = {}) {
      refresh();
      if (depthOnly && [...objects.keys()].some(o => o.layers.mask & (1 << layer))) throw new Error('Diagnostic camera layer became occupied');
      for (const [o, mask] of lights) o.layers.mask = depthOnly && (mask & camera.layers.mask) ? (mask | (1 << layer)) >>> 0 : mask;
      let enabledCasters = 0, enabledReceivers = 0;
      for (const [o, saved] of objects) {
        o.castShadow = saved.cast && (!castGroup || casterGroup(o) === castGroup);
        o.receiveShadow = saved.receive && (allReceivers || receiverGroup(o) === receiveGroup);
        if (o.castShadow) enabledCasters++; if (o.receiveShadow) enabledReceivers++;
      }
      const probe = { name, completed: false, depthOnly, update, enabledCasters, enabledReceivers, shadowDraws: 0, receiverDraws: 0 };
      if (receiverOnly) probe.shadowFeatureDraws = 0;
      if (renderer.uniformBones === true) Object.assign(probe, { uniformBoneDraws: 0, textureBoneDraws: 0, maxRigBones: 0 });
      check.probes.push(probe); activeProbe = probe;
      history.lastProbe = name;
      step('World shadow check' + (view ? ` [${view.x}, ${view.y}]` : '') + ': ' + name);
      renderer.shadowMap.needsUpdate = update; renderer.info.reset();
      renderer.setRenderTarget(target); renderer.render(scene, depthOnly ? shadowCamera : camera);
      probe.totalDraws = renderer.info.render.calls;
      probe.colorDraws = probe.totalDraws - probe.shadowDraws;
      renderer.setRenderTarget(previousTarget);
      await waitForGpu(renderer);
      probe.glError = renderer.getContext().getError();
      if (probe.glError) throw new Error('World shadow check WebGL error ' + probe.glError);
      probe.completed = true;
      history.completedProbes++;
    }
    for (const group of ['static opaque', 'static cutout/displaced', 'instanced opaque', 'instanced cutout/displaced', 'skinned opaque', 'skinned cutout/displaced']) {
      refresh();
      if ([...objects].some(([o, s]) => s.cast && casterGroup(o) === group)) await draw('cast: ' + group, { depthOnly: true, castGroup: group, update: true });
    }
    await draw('cast: all world geometry', { depthOnly: true, update: true });
    // Freeze the complete, real world depth map for each surface test.
    await draw('surfaces: shadow receiving off');
    for (const group of ['standard surfaces', 'physical surfaces', 'custom surface shaders', 'instanced scenery', 'skinned bodies', 'fur']) {
      refresh();
      if ([...objects].some(([o, s]) => s.receive && receiverGroup(o) === group)) await draw('receive: ' + group, { receiveGroup: group });
    }
    await draw('receive: all world surfaces', { allReceivers: true });
    await draw('combined: original world draw', { allReceivers: true, update: true });
    check.complete = true; history.complete = true;
  } finally {
    activeProbe = null;
    for (const [o, saved] of objects) { o.castShadow = saved.cast; o.receiveShadow = saved.receive; o.onBeforeShadow = saved.before; o.onBeforeRender = saved.beforeRender; o.onAfterRender = saved.afterRender; }
    for (const [o, mask] of lights) o.layers.mask = mask;
    renderer.shadowMap.autoUpdate = auto; renderer.shadowMap.needsUpdate = needs;
    renderer.info.autoReset = infoAuto; renderer.setRenderTarget(previousTarget);
    check.stateRestored = [...objects].every(([o, s]) => o.castShadow === s.cast && o.receiveShadow === s.receive && o.onBeforeShadow === s.before && o.onBeforeRender === s.beforeRender && o.onAfterRender === s.afterRender)
      && [...lights].every(([o, mask]) => o.layers.mask === mask);
    history.stateRestored = check.stateRestored;
  }
}
