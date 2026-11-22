const CACHE = "mcres-academy-v6";
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

// Cache లో Put చేసే పని పూర్తయ్యే వరకు SW ని Alive ఉంచే Helper
function putInCache(req, res) {
  const copy = res.clone();
  return caches.open(CACHE).then((c) => c.put(req, copy));
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
          // FIX 1: Put పూర్తయ్యే వరకు SW Alive
          if (res && res.ok) {
            e.waitUntil(putInCache(req, res));
          }
          return res;
        })
        .catch(() =>
          // FIX 2: కేవలం మన CACHE లోనే వెతకడం
          caches.open(CACHE).then((c) =>
            c.match(req).then((r) => r || c.match(new URL("./index.html", SCOPE)))
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
              e.waitUntil(putInCache(req, res));
            }
            return res;
          })
          .catch(
            () =>
              new Response("Offline - MCRES Academy", {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "text/plain" },
              })
          );
      })
    )
  );
});
