const CACHE = "mcres-v3";
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
      // ఒక్క ఫైల్ Fail అయినా మిగిలినవి Cache అవుతాయి
      for (const file of FILES) {
        try {
          await c.add(file);
        } catch (err) {
          console.log("Cache skip:", file);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k.startsWith("mcres-") && k !== CACHE) {
            return caches.delete(k);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // కేవలం మన MCRES App Files మాత్రమే - వేరే Websites కాదు
  if (!req.url.startsWith(self.location.origin)) return;

  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
