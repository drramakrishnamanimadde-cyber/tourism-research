const CACHE = "mcres-academy-v5";
const CACHE_PREFIX = "mcres-academy-";
const SCOPE = self.registration.scope;
const FILES = [
  "./",
  "./index.html",
  "./login.html",
  "./tests.html",
  "./exam.html",
  "./results.html",
  "./profile.html",
  "./manifest.json",
  "./logo.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      for (const file of FILES) {
        try {
          await c.add(file);
        } catch (err) {
          console.log("Cache skip:", file);
        }
      }
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => {
            // FIX 1: కేవలం MCRES Academy Cache లు మాత్రమే Delete
            if (k.startsWith(CACHE_PREFIX) && k !== CACHE) {
              return caches.delete(k);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith(SCOPE)) return;

  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match(new URL("./index.html", SCOPE)))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        // FIX 2: Cache లో లేకపోతే undefined కాదు, స్పష్టమైన Offline Response
        .catch(
          () =>
            new Response("Offline - MCRES Academy", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/plain" },
            })
        );
    })
  );
});
