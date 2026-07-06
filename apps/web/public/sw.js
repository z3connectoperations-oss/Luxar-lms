// App-shell service worker for the Luxar LMS PWA.
// Keeps the cached shell in sync with the assets actually loaded online, so the
// app boots offline. Lesson media is stored separately via IndexedDB (lib/offline.ts).
const CACHE = "luxar-shell-v2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  // Best-effort precache of the shell; runtime caching fills in the rest.
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/index.html").catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin GETs; API calls (other origin) pass through.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // SPA navigations: network-first; on success refresh the cached shell so it
  // always references the latest asset hashes. Offline → serve cached shell.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")).then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Static assets (hashed JS/CSS, icons): cache-first, and cache on first fetch
  // so the exact assets the shell references are available offline.
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok && (res.type === "basic" || res.type === "default")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || new Response("Network error", { status: 503 }));
    })
  );
});
