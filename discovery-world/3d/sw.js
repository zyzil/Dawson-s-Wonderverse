// Offline helper for the home-screen app: keeps a copy of the game on the device.
// The game page is fetched fresh when online (so updates arrive) and from the copy when offline.
// (build 28) 'no-cache': always ask GitHub whether the page changed (a quick check that downloads nothing when it
// hasn't), so a new version arrives the next time the app is opened instead of after the 10-minute web cache.
const CACHE = 'dawsons-world-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './graphics-tests.html', './shadow-check.html', './src/graphics.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dawsons-world-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin) return;
  const base = new URL('./', self.location.href).pathname;
  const isGame = url.pathname === base || url.pathname === base + 'index.html';
  // The checks page must never replace the offline game. Match by pathname so
  // graphics/build query parameters still retrieve the right offline document.
  const isCheck = url.pathname === base + 'graphics-tests.html' || url.pathname === base + 'shadow-check.html' || url.pathname === base + 'src/graphics.js';
  if (isGame || isCheck) {
    const key = isGame ? './index.html' : url.origin + url.pathname;
    let update = Promise.resolve();
    const response = fetch(req, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copy = r.clone(); update = caches.open(CACHE).then(c => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key));
    e.respondWith(response);
    e.waitUntil(response.then(() => update));
  }
  else e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
