const CACHE_NAME = 'borrowed-shell-v116-map-fallback';
const APP_SHELL = ['./', './index.html', './styles.css?v=map-fallback-11', './stark-theme.css?v=stark-contrast-2', './theme-worlds.css?v=stitch-explore-tab-6', './spider-theme.css?v=spider-2', './app.js?v=spider-drag-2', './community.js?v=campus-notifications-4', './campus-board.js?v=private-id-regno-6', './map.js?v=map-fallback-11', './account-features.js', './stark-theme.js?v=stark-startup-1', './spider-theme.js?v=spider-2', './theme-worlds.js?v=capital-b-dot-2', './irene-easter-egg.js?v=5', './assets/irene-photo.jpg', './assets/friends-cast-sheet.png', './manifest.webmanifest', './icon.svg', './assets/borrowed-icon-tilted.png', './assets/borrowed-icon-tilted.png?v=capital-b-3d-1', './friends-wordmark.png', './supabase-config.js', './supabase-client.js'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});

