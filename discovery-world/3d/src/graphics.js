// A rendering profile, independent of automated test mode: voice, saves and
// learning games remain enabled. The Pixel 10 Pro was verified with all visual
// features restored except shadow maps. Explicit safe links remain available.
export function useSafeGraphics(search = location.search, ua = navigator.userAgent) {
  const requested = new URLSearchParams(search).get('graphics');
  if (requested === 'full') return false;
  return requested === 'safe' || requested === 'full-no-shadows' || requested === 'full-basic-shadows' || /Android/i.test(ua);
}

export const GRAPHICS_TRIALS = Object.freeze([
  { key: 'resolution', label: 'Sharper picture', detail: 'Restore the original picture resolution.' },
  { key: 'shadows', label: 'Shadows', detail: 'Restore real-time shadow-map drawing.' },
  { key: 'scenery', label: 'Detailed scenery', detail: 'Restore the detailed trees, landmarks and textures.' },
  { key: 'fur', label: 'Plush fur', detail: 'Restore the extra fur layers on creatures.' },
  { key: 'effects', label: 'Glow and effects', detail: 'Restore the original post-processing pipeline and its antialiasing buffer.' },
  { key: 'antialias', label: 'Smooth canvas edges', detail: 'Restore canvas antialiasing, with post-processing still off.' },
  { key: 'power', label: 'Graphics preference', detail: 'Restore the high-performance graphics request.' },
]);

export function getGraphicsProfile(search = location.search, ua = navigator.userAgent) {
  const safe = useSafeGraphics(search, ua), params = new URLSearchParams(search);
  const androidDefault = /Android/i.test(ua) && !params.has('graphics') && !params.has('restore');
  const requested = new Set(params.get('graphics') === 'full-basic-shadows'
    ? GRAPHICS_TRIALS.map(t => t.key)
    : params.get('graphics') === 'full-no-shadows' || androidDefault
      ? GRAPHICS_TRIALS.filter(t => t.key !== 'shadows').map(t => t.key)
      : (params.get('restore') || '').split(','));
  // Restore requests always start from the safe baseline and are limited to
  // named features. They never change the default profile or saved game.
  const restored = safe ? GRAPHICS_TRIALS.filter(t => requested.has(t.key)).map(t => t.key) : [];
  const flags = Object.fromEntries(GRAPHICS_TRIALS.map(t => [t.key, !safe || restored.includes(t.key)]));
  const shadowType = params.get('graphics') === 'full-basic-shadows' || params.get('shadow') === 'basic' ? 'basic' : 'pcf';
  // The physical Pixel passed Basic at 1536, but the full game's original
  // whole-world warmup still reset. Keep that comparison explicitly available.
  const localShadowWarmup = flags.shadows && shadowType === 'basic' && params.get('warmup') !== 'original';
  const shadowPreflight = localShadowWarmup && params.get('preflight') === '1';
  const worldShadowCheck = shadowPreflight && ['1', 'areas'].includes(params.get('worldprobe'));
  const worldShadowCheckAreas = worldShadowCheck && params.get('worldprobe') === 'areas';
  const receiverShadowPrograms = flags.shadows && shadowType === 'basic' && params.get('shadowcode') === 'receivers';
  const uniformBones = receiverShadowPrograms && params.get('bones') === 'uniform';
  const packedShadowDepth = receiverShadowPrograms && params.get('shadowstorage') === 'rgba';
  return Object.freeze({ safe, restored: Object.freeze(restored), shadowType, localShadowWarmup, shadowPreflight, worldShadowCheck, worldShadowCheckAreas, receiverShadowPrograms, uniformBones, packedShadowDepth, ...flags });
}

export const GRAPHICS = getGraphicsProfile();
export const SAFE_GRAPHICS = GRAPHICS.safe;
