/*
 * The service worker.
 *
 * Hand-written rather than generated, for the same reason there is no charting
 * library and no i18n library in this app: the whole requirement is three
 * caching rules, and Workbox would bring a build step, a manifest injection
 * plugin, and a runtime to express them.
 *
 * The one rule that matters is at the bottom of `fetch`: **nothing
 * cross-origin is ever cached, and nothing that is not a GET is ever cached.**
 * Every call that carries identity or a grade — Firebase Auth, the Realtime
 * Database socket, the callable functions — is cross-origin, so it passes
 * straight through to the network and cannot be served stale. A cached score,
 * or a cached response belonging to whoever used this browser last, is a
 * correctness bug and a privacy one; the shape of this file is what makes it
 * impossible rather than merely unlikely.
 *
 * What IS cached is the shell: the HTML, the hashed JS and CSS, the icons.
 * That is what makes the app open offline. The *data* it opens with comes from
 * localStorage, written by src/lib/offline.ts — not from here.
 *
 * Bump VERSION when the caching rules below change. Asset filenames are
 * content-hashed by Vite, so a normal release does not need it.
 */

const VERSION = 'v1';
const SHELL_CACHE = `aiskills-shell-${VERSION}`;
const ASSET_CACHE = `aiskills-assets-${VERSION}`;
const CURRENT = [SHELL_CACHE, ASSET_CACHE];

/** The document every route is served from — this is a single-page app. */
const SHELL_URL = '/index.html';

/** Enough to boot offline. Hashed assets are added as they are requested. */
const PRECACHE = [SHELL_URL, '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-maskable.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Individually, so one missing optional file cannot fail the whole install.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * The page asks for this after it has told the reader an update is ready, so
 * a new worker never replaces a running one mid-submission.
 */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Anything that is not a plain same-origin GET goes to the network,
  // untouched and unrecorded. See the note at the top of this file.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A navigation is a request for the app itself. Network first so a deploy is
  // picked up on the next load, shell fallback so a closed tunnel still opens
  // the app rather than the browser's dinosaur.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL_URL).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Vite writes content-hashed filenames under /assets, so a hit is always the
  // right file and a miss is always a new build. Cache first, no revalidation.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else same-origin — icons, the manifest — is small, unhashed,
  // and rarely changes: serve what we have and refresh it in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
