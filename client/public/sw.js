// Visualize Service Worker — Offline-first inspection mode
const CACHE_NAME = "visualize-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// Install: cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy: Network-first for API, Cache-first for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first with offline fallback from cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET responses for offline use
          if (event.request.method === "GET" && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Storage/images: cache-first
  if (url.pathname.startsWith("/manus-storage/") || url.pathname.match(/\.(png|jpg|jpeg|webp|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML/JS/CSS: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Listen for messages to pre-cache inspection data
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PRECACHE_INSPECTION") {
    const { urls } = event.data;
    if (urls && Array.isArray(urls)) {
      caches.open(CACHE_NAME).then((cache) => {
        urls.forEach((url) => {
          fetch(url).then((response) => {
            if (response.ok) cache.put(url, response);
          }).catch(() => {});
        });
      });
    }
  }
});
