/**
 * Service worker registration, and the update handshake.
 *
 * The worker itself is `public/sw.js` — plain JavaScript, served as-is rather
 * than bundled, because it has to be fetchable at the scope root and it must
 * not carry the app's dependency graph.
 *
 * Registration is deliberately *not* unconditional. A worker registered
 * against the dev server or the emulator suite caches a shell that is about to
 * change on every save, and the resulting "why am I seeing yesterday's build"
 * is a bad hour for anyone working on this. It runs in production builds only.
 */

let registration: ServiceWorkerRegistration | null = null;
/** Guards the one reload the update flow performs. */
let reloading = false;
/** StrictMode mounts effects twice; registering twice would double the listeners. */
let started = false;

export const serviceWorkerSupported =
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

/**
 * Registers the worker and reports when a newer one is waiting to take over.
 *
 * `onUpdateReady` fires when a new build has installed and is parked. It is
 * never applied automatically: swapping the worker reloads the page, and doing
 * that under someone who is mid-submission would lose their prompt. The reader
 * is told, and decides.
 */
export function registerServiceWorker(onUpdateReady: () => void): void {
  if (!serviceWorkerSupported || !import.meta.env.PROD) return;
  if (started) return;
  started = true;

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;

        // Already parked when we arrived — a second tab installed it.
        if (reg.waiting && navigator.serviceWorker.controller) onUpdateReady();

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // `controller` is null on the very first install; that is the
            // worker taking over an uncontrolled page, not an update.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdateReady();
            }
          });
        });
      })
      .catch(() => {
        // A failed registration costs offline support and nothing else. The
        // app works; there is nothing worth interrupting the reader for.
      });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

/** Applies a waiting update. The controllerchange listener above reloads. */
export function applyServiceWorkerUpdate(): void {
  registration?.waiting?.postMessage('SKIP_WAITING');
}

/**
 * Whether the app is running as an installed PWA rather than in a tab. Only
 * used to tell the reader on the Settings page; nothing behaves differently.
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}
