/* ProPrompt — kill-switch service worker.
 * The site no longer uses a caching service worker. This SW exists only to retire
 * any previously-installed worker (which precached the old free site): it clears all
 * caches, unregisters itself, and reloads open tabs so returning visitors always get
 * the fresh, gated site. Safe to keep indefinitely. */
self.addEventListener("install", function (e) { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      var clients = await self.clients.matchAll({ type: "window" });
      clients.forEach(function (c) { try { c.navigate(c.url); } catch (_) {} });
    } catch (_) {}
  })());
});

/* Never serve from cache — let everything hit the network. */
self.addEventListener("fetch", function (e) { /* no-op */ });
