import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker in production builds only. In dev, any worker left over on this origin
 * (e.g. from a previous `vite preview` on the same port) is removed so it can't serve stale files over HMR.
 * Updates are silent (`autoUpdate`): a new worker activates on its own and the next launch runs new code.
 */
export function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return;

    if (import.meta.env.PROD) {
        registerSW({ immediate: true });
        return;
    }

    navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister())))
        .then(async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter(k => /^(workbox-|echoes-)/.test(k)).map(k => caches.delete(k)));
        })
        .catch(() => { /* cleanup is best-effort */ });
}
