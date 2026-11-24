import { Config } from '../config/Config';
import type { SkinPreset } from '../config/SkinsConfig';
import { SafeStorage } from '../storage/SafeStorage';

interface SaveData {
    activeSkinId: string;
    levelsCompleted: number;
    lastSeed: string | null;
}

const SAVE_KEY = 'pjx-echoes:save:v1';

const DEFAULT_SAVE: SaveData = {
    activeSkinId: Config.Skins.defaultSkinId,
    levelsCompleted: 0,
    lastSeed: null,
};

function sanitizeSave(raw: unknown, defaults: SaveData): SaveData {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const knownSkin = Config.Skins.presets.some(p => p.id === r.activeSkinId);
    return {
        activeSkinId: knownSkin ? (r.activeSkinId as string) : defaults.activeSkinId,
        levelsCompleted:
            typeof r.levelsCompleted === 'number' && Number.isFinite(r.levelsCompleted) && r.levelsCompleted >= 0
                ? Math.floor(r.levelsCompleted)
                : defaults.levelsCompleted,
        lastSeed: typeof r.lastSeed === 'string' ? r.lastSeed : defaults.lastSeed,
    };
}

type SkinListener = (skin: SkinPreset) => void;

/**
 * Global registry for the active cosmetic skin and persisted progress
 * (matches the LightManager / ParticleEffectManager singleton pattern).
 * Entities read the active skin when they are built; World subscribes to live changes.
 */
export class SkinManager {
    static readonly instance = new SkinManager();

    private readonly storage = new SafeStorage<SaveData>(SAVE_KEY, DEFAULT_SAVE, sanitizeSave);
    private readonly listeners = new Set<SkinListener>();

    getActiveSkin(): SkinPreset {
        const presets = Config.Skins.presets;
        return presets.find(p => p.id === this.storage.get().activeSkinId) ?? presets[0];
    }

    /** Switches to the next preset (wrapping), persists it, and notifies subscribers. */
    cycleNext(): SkinPreset {
        const presets = Config.Skins.presets;
        const index = presets.findIndex(p => p.id === this.getActiveSkin().id);
        return this.setSkin(presets[(index + 1) % presets.length].id);
    }

    setSkin(id: string): SkinPreset {
        const skin = Config.Skins.presets.find(p => p.id === id) ?? this.getActiveSkin();
        this.storage.update({ activeSkinId: skin.id });
        this.listeners.forEach(listener => listener(skin));
        return skin;
    }

    /** Subscribe to skin changes. Returns an unsubscribe function. */
    onSkinChanged(listener: SkinListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getLevelsCompleted(): number {
        return this.storage.get().levelsCompleted;
    }

    recordLevelCompleted(): void {
        this.storage.update({ levelsCompleted: this.storage.get().levelsCompleted + 1 });
    }

    getLastSeed(): string | null {
        return this.storage.get().lastSeed;
    }

    setLastSeed(seed: string): void {
        this.storage.update({ lastSeed: seed });
    }
}
