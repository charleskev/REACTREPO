const CACHE_NAME = "agrisystem-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/agrisystem-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

// Always prefer current server data. The cached shell is only a fallback when
// a farmer temporarily loses signal; reports still require a connection to save.
self.addEventListener("fetch", event => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/")));
});
