/**
 * Service worker (built by vite-plugin-pwa, `injectManifest` strategy).
 *
 * - App shell, JS/CSS, fonts, sprites, SFX and icons are precached (list injected at build time).
 * - Streamed music (`/audio/music/main.mp3`, ~5.8 MB, played by Howler with `html5: true`) lives in its own
 *   cache and is served through `RangeRequestsPlugin`. The <audio> element asks for byte ranges, and a plain
 *   precache hit would answer 200 instead of 206, which breaks seeking/looping offline. The full file is
 *   fetched once at install so music works offline without having to be played online first.
 *
 * Not type-checked by `tsc` against the WebWorker lib (the app tsconfig uses the DOM lib), so the few worker
 * globals we need are declared locally.
 */

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { RangeRequestsPlugin } from 'workbox-range-requests';

interface WorkerScope {
    __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
    skipWaiting(): Promise<void>;
    addEventListener(type: 'install', listener: (event: WorkerExtendableEvent) => void): void;
}
interface WorkerExtendableEvent extends Event {
    waitUntil(promise: Promise<unknown>): void;
}
declare const self: WorkerScope;

/** Bump the suffix if `public/audio/music/main.mp3` is replaced (the cache is otherwise kept across deploys). */
const MUSIC_CACHE = 'echoes-music-v1';
const MUSIC_URL = '/audio/music/main.mp3';

// ---- App shell + gameplay assets -------------------------------------------------------------------
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Offline navigations (including `/?seed=...`) get the precached shell; leave other pages and files alone.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/particles\.html/, /\.[a-z0-9]+$/i],
}));

// ---- Streamed music --------------------------------------------------------------------------------
registerRoute(
    ({ url }) => url.pathname === MUSIC_URL,
    new CacheFirst({
        cacheName: MUSIC_CACHE,
        plugins: [
            // Only cache complete responses; a 206 from a Range request is never stored
            new CacheableResponsePlugin({ statuses: [200] }),
            // Slice the cached full file into 206 responses for Range requests
            new RangeRequestsPlugin(),
        ],
    }),
);

// Warm the music cache at install. Failure (e.g. flaky network) never blocks installation:
// the CacheFirst route above still caches the file the first time it is fetched in full.
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        try {
            const cache = await caches.open(MUSIC_CACHE);
            if (await cache.match(MUSIC_URL)) return;
            const response = await fetch(MUSIC_URL);
            if (response.status === 200) await cache.put(MUSIC_URL, response);
        } catch (err) {
            console.warn('[sw] music warm-up failed; it will be cached on first play', err);
        }
    })());
});

// Silent auto-update: a new worker takes over as soon as it is installed; open pages keep running their
// current code until the next launch.
void self.skipWaiting();
clientsClaim();
