//change CACHE to trigger update
const CACHE = "MDEditor-v131";

const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./custom.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./vendor/easymde.js",
  "./vendor/easymde.css",
  "./vendor/fontawesome/css/font-awesome.min.css",
  "./vendor/fontawesome/fonts/fontawesome-webfont.woff2",
  "./vendor/fontawesome/fonts/fontawesome-webfont.woff",
  "./vendor/fontawesome/fonts/fontawesome-webfont.ttf",
  "./vendor/fonts/NotoSansSymbols2-Regular.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


