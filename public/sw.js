// NaturalHeal AI — simple offline service worker
const CACHE = "nh-v16";
const SHELL = ["/", "/index.html", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                 // API writes etc. -> network
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;     // data hamesha live network se
  if (req.mode === "navigate") {
    // navigation: network first, offline par cached shell
    e.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }
  // baaki static: cache first, warna network (aur cache kar lo)
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
