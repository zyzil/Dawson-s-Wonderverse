// A rendering profile, independent of automated test mode: voice, saves and
// learning games remain enabled. The Pixel 10 Pro was verified with the lighter
// scenery, no shell fur, no post-processing, no shadows and lower resolution.
export function useSafeGraphics(search = location.search, ua = navigator.userAgent) {
  const requested = new URLSearchParams(search).get('graphics');
  if (requested === 'full') return false;
  return requested === 'safe' || /Android/i.test(ua);
}
export const SAFE_GRAPHICS = useSafeGraphics();
