/**
 * Small typed wrapper around localStorage that never throws.
 *
 * localStorage can be missing or throw (private browsing, blocked site data, quota, sandboxed
 * iframes), so every access is guarded. When storage is unusable the data simply lives in
 * memory for the session. `sanitize` validates whatever was parsed from disk so corrupted or
 * outdated saves fall back to safe values instead of crashing the game.
 */
export class SafeStorage<T extends object> {
    private data: T;

    constructor(
        private readonly key: string,
        private readonly defaults: T,
        private readonly sanitize: (raw: unknown, defaults: T) => T,
    ) {
        this.data = this.read();
    }

    get(): Readonly<T> {
        return this.data;
    }

    /** Merges a patch into the current data and persists it (best effort). */
    update(patch: Partial<T>): void {
        this.data = { ...this.data, ...patch };
        this.write();
    }

    private read(): T {
        try {
            const raw = window.localStorage.getItem(this.key);
            if (raw === null) return { ...this.defaults };
            return this.sanitize(JSON.parse(raw), this.defaults);
        } catch {
            return { ...this.defaults };
        }
    }

    private write(): void {
        try {
            window.localStorage.setItem(this.key, JSON.stringify(this.data));
        } catch {
            // Storage unavailable or full — keep going with in-memory state.
        }
    }
}
