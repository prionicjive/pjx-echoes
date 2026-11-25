import { Howl, Howler } from 'howler';
import gsap from 'gsap';
import { Config } from '../config/Config';
import type { SfxName } from '../config/AudioConfig';
import { SafeStorage } from '../storage/SafeStorage';

interface AudioSave {
    muted: boolean;
    masterVolume: number;
}

const DEFAULT_SAVE: AudioSave = {
    muted: false,
    masterVolume: Config.Audio.defaultMasterVolume,
};

function sanitizeSave(raw: unknown, defaults: AudioSave): AudioSave {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        muted: typeof r.muted === 'boolean' ? r.muted : defaults.muted,
        masterVolume:
            typeof r.masterVolume === 'number' && Number.isFinite(r.masterVolume)
                ? Math.min(1, Math.max(0, r.masterVolume))
                : defaults.masterVolume,
    };
}

const MUSIC_KEY = 'music:main';

// Same events Howler's own unlock listens for. These are the only ones that browsers treat as a
// user activation for audio (touchstart and pointerdown are not, on iOS).
const GESTURE_EVENTS = ['touchend', 'click', 'keydown'] as const;

/**
 * Central audio facade (singleton, same convention as SkinManager). Game code calls semantic
 * methods (`playSfx('lidar')`) and never touches Howler.
 *
 * - SFX: Web Audio Howls, preloaded at boot, overlapping playback, per-sound throttle.
 * - Music: one HTML5 (streamed) looping Howl, created on the first user gesture so a 1-10 MB
 *   file never competes with initial load, and so Howler's unlocked HTML5 audio pool exists.
 * - Missing or undecodable files warn once, then that sound is a silent no-op.
 * - Mute / master volume persist via SafeStorage under their own versioned key.
 */
export class AudioManager {
    static readonly instance = new AudioManager();

    private readonly storage = new SafeStorage<AudioSave>(
        Config.Audio.storageKey, DEFAULT_SAVE, sanitizeSave
    );

    private readonly sfx = new Map<SfxName, Howl>();
    private readonly lastPlayedAt = new Map<SfxName, number>();
    /** Asset keys that failed to load; each warns once and is skipped from then on. */
    private readonly failed = new Set<string>();

    private music: Howl | null = null;
    private musicPlayId: number | null = null;
    private pausedForHidden = false;

    /** Music level multiplier driven by ducking (1 = full). Tweened with GSAP on this plain object. */
    private readonly duck = { level: 1 };
    private duckTween: gsap.core.Tween | null = null;

    private armed = false;
    private gestureSeen = false;

    private constructor() {
        Howler.mute(this.storage.get().muted);
        Howler.volume(this.storage.get().masterVolume);
    }

    // ---- Setup ---------------------------------------------------------------------------

    /**
     * Loads the SFX and starts listening for the first user gesture. Safe to call without
     * awaiting; call once after the game's own assets have loaded.
     */
    init(): void {
        if (this.armed) return;
        this.armed = true;

        for (const name of Object.keys(Config.Audio.sfx) as SfxName[]) {
            this.getSfx(name);
        }

        // Registered AFTER the SFX Howls exist so that, on the same event, Howler's own unlock
        // handler (registered when the first Howl was built) runs first and fills its pool of
        // unlocked HTML5 Audio nodes. The music Howl then gets one of those nodes.
        for (const type of GESTURE_EVENTS) {
            document.addEventListener(type, this.onGesture, true);
        }
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    // ---- SFX -----------------------------------------------------------------------------

    playSfx(name: SfxName): void {
        if (!this.gestureSeen || this.failed.has(`sfx:${name}`)) return;

        const def = Config.Audio.sfx[name];
        const now = performance.now();
        const last = this.lastPlayedAt.get(name);
        if (last !== undefined && now - last < def.minIntervalMs) return;

        const howl = this.getSfx(name);
        if (!howl) return;
        this.lastPlayedAt.set(name, now);
        try {
            howl.play();
        } catch {
            // Never let audio take the game down.
        }
    }

    /** Wall bump: ignores glancing contacts below the configured impact speed (m/s). */
    playBump(impactSpeed: number): void {
        if (impactSpeed < Config.Audio.bumpMinImpactSpeed) return;
        this.playSfx('bump');
    }

    private getSfx(name: SfxName): Howl | null {
        const existing = this.sfx.get(name);
        if (existing) return existing;
        const key = `sfx:${name}`;
        if (this.failed.has(key)) return null;

        const def = Config.Audio.sfx[name];
        try {
            const howl = new Howl({
                src: [...def.src],
                volume: def.volume,
                preload: true,
                onloaderror: (_id, err) => this.markFailed(key, def.src[0], err),
                onplayerror: (_id, err) => this.markFailed(key, def.src[0], err),
            });
            this.sfx.set(name, howl);
            return howl;
        } catch (err) {
            this.markFailed(key, def.src[0], err);
            return null;
        }
    }

    // ---- Music ---------------------------------------------------------------------------

    /** Starts (or resumes) the background music. Needs a prior user gesture; otherwise a no-op. */
    startMusic(): void {
        if (!this.gestureSeen || this.failed.has(MUSIC_KEY) || document.hidden) return;

        try {
            if (!this.music) {
                const def = Config.Audio.music.main;
                this.music = new Howl({
                    src: [...def.src],
                    html5: true, // Stream; don't decode the whole file into memory
                    loop: true,
                    volume: this.musicVolume(),
                    onloaderror: (_id, err) => this.markFailed(MUSIC_KEY, def.src[0], err),
                    // Playback blocked by autoplay policy is not a missing asset: the next
                    // gesture simply retries (see onGesture).
                    onplayerror: () => {},
                });
                // Queued by Howler until the stream is ready to play
                this.musicPlayId = this.music.play();
                return;
            }

            if (this.music.state() !== 'loaded') return; // Initial play() is still queued
            if (!this.music.playing()) this.music.play(this.musicPlayId ?? undefined);
        } catch {
            // Never let audio take the game down.
        }
    }

    /** Fades the music down (level transition cover). */
    duckMusic(): void {
        this.tweenDuck(Config.Audio.music.duckLevel, Config.Audio.music.duckFadeSeconds);
    }

    /** Fades the music back up (next cave fading in). */
    restoreMusic(): void {
        this.tweenDuck(1, Config.Audio.music.restoreFadeSeconds);
    }

    private tweenDuck(target: number, seconds: number): void {
        this.duckTween?.kill();
        this.duckTween = gsap.to(this.duck, {
            level: target,
            duration: seconds,
            ease: 'power1.inOut',
            onUpdate: () => this.applyMusicVolume(),
        });
    }

    private musicVolume(): number {
        return Config.Audio.music.main.volume * this.duck.level;
    }

    private applyMusicVolume(): void {
        try {
            this.music?.volume(this.musicVolume());
        } catch {
            // ignore
        }
    }

    // ---- Mute / volume -------------------------------------------------------------------

    isMuted(): boolean {
        return this.storage.get().muted;
    }

    toggleMute(): boolean {
        return this.setMuted(!this.isMuted());
    }

    setMuted(muted: boolean): boolean {
        this.storage.update({ muted });
        Howler.mute(muted);
        return muted;
    }

    getMasterVolume(): number {
        return this.storage.get().masterVolume;
    }

    setMasterVolume(volume: number): void {
        const v = Math.min(1, Math.max(0, volume));
        this.storage.update({ masterVolume: v });
        Howler.volume(v);
    }

    // ---- Gesture unlock / lifecycle ------------------------------------------------------

    /**
     * Gamepad buttons are not a user activation in most browsers, so this only nudges (tries to
     * resume and start music, which succeeds when the browser allows it). A real tap, click or
     * key press is still what unlocks audio, and that always retries.
     */
    nudge(): void {
        this.resumeContext();
        this.startMusic();
    }

    private readonly onGesture = (): void => {
        this.gestureSeen = true;
        this.resumeContext();
        this.startMusic();

        // Stay armed until the context is running and music is playing (or can never play)
        const ctxOk = !Howler.usingWebAudio || Howler.ctx?.state === 'running';
        const musicDone = this.failed.has(MUSIC_KEY) || (this.music?.playing() ?? false);
        if (ctxOk && musicDone) {
            for (const type of GESTURE_EVENTS) {
                document.removeEventListener(type, this.onGesture, true);
            }
        }
    };

    private readonly onVisibilityChange = (): void => {
        try {
            if (document.hidden) {
                if (this.music?.playing()) {
                    this.music.pause();
                    this.pausedForHidden = true;
                }
            } else if (this.pausedForHidden) {
                this.pausedForHidden = false;
                this.resumeContext();
                this.startMusic();
            }
        } catch {
            // ignore
        }
    };

    private resumeContext(): void {
        try {
            const ctx = Howler.ctx;
            if (ctx && ctx.state !== 'running') {
                void ctx.resume().catch(() => {});
            }
        } catch {
            // ignore
        }
    }

    // ---- Diagnostics ---------------------------------------------------------------------

    private markFailed(key: string, src: string, err: unknown): void {
        if (this.failed.has(key)) return;
        this.failed.add(key);
        const reason = typeof err === 'string' ? err : err instanceof Error ? err.message : '';
        console.warn(`[audio] "${key}" unavailable (${src}); skipping.${reason ? ` ${reason}` : ''}`);
    }

    /** One-line status for the debug overlay. */
    getDebugLine(): string {
        let music: string;
        if (this.failed.has(MUSIC_KEY)) music = 'missing';
        else if (!this.music) music = this.gestureSeen ? 'idle' : 'waiting for tap/key';
        else if (this.music.playing()) music = this.duck.level < 1 ? 'playing (ducked)' : 'playing';
        else if (this.pausedForHidden) music = 'paused';
        else music = this.music.state() === 'loaded' ? 'blocked (tap/key)' : 'loading';

        const missing = [...this.failed].filter(k => k !== MUSIC_KEY).map(k => k.replace('sfx:', ''));
        return `Audio: ${this.isMuted() ? 'MUTED' : 'ON'} (M) | Music: ${music}` +
            (missing.length ? ` | Missing SFX: ${missing.join(', ')}` : '');
    }
}
