const CACHE = "mcres-v4";
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
      // Cache అయ్యాకే కొత్త SW Active అవుతుంది
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
            if (k.startsWith("mcres-") && k !== CACHE) {
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

  // FIX: కేవలం మన mcresacademy-app/ Folder మాత్రమే
  // వేరే Folder / వేరే Website Requests ని వదిలేస్తుంది
  if (!req.url.startsWith(SCOPE)) return;

  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Error Response ని Cache చేయొద్దు
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
          // 200 OK మాత్రమే Cache చేయాలి
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
