const CACHE = "mallaiah-academy-v9";
const CACHE_PREFIX = "mallaiah-academy-";
const SCOPE = self.registration.scope;
const FILES = [
  "./",
  "./index.html",
  "./login.html",
  "./tests.html",
  "./test-instructions.html",
  "./exam.html",
  "./results.html",
  "./profile.html",
  "./manifest.json",
  "./logo.png",
  "./logo-192.png",
  "./logo-512.png",
  "./logo-maskable-512.png"
];

function putInCache(req, res) {
  const copy = res.clone();
  return caches.open(CACHE).then((c) => c.put(req, copy));
}

function offlineResponse() {
  return new Response("Offline - MALLAIAH Academy", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain" },
  });
}

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

  // HTML - Network First
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            return putInCache(req, res)
              .catch(() => {})
              .then(() => res);
          }
          return res;
        })
        .catch(() =>
          caches.open(CACHE).then((c) =>
            c.match(req).then(
              (r) =>
                r ||
                c.match(new URL("./index.html", SCOPE)).then((fallback) => fallback || offlineResponse())
            )
          )
        )
    );
    return;
  }

  // Images / CSS / JS - Cache First
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.ok) {
              return putInCache(req, res)
                .catch(() => {})
                .then(() => res);
            }
            return res;
          })
          .catch(() => offlineResponse());
      })
    )
  );
});
