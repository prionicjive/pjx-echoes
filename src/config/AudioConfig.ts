// Audio: file-based SFX and streamed music. Files live in public/audio/ (served statically,
// never bundled). Missing files are fine: AudioManager warns once per asset and skips it.
//
// `src` lists candidate files in priority order. Howler picks the FIRST entry whose codec the
// browser supports (it does not fall back on a 404), so keep .mp3 first: it plays everywhere,
// so dropping in only .mp3 files always works.

export type SfxName = 'lidar' | 'bump' | 'torch' | 'anti' | 'sentry' | 'switch' | 'exit';

export interface SfxDef {
    src: readonly string[];
    /** 0..1, relative to the master volume */
    volume: number;
    /** Minimum gap between plays of this sound (also guards against duplicate contact events) */
    minIntervalMs: number;
}

const sfx = (name: string, volume: number, minIntervalMs: number): SfxDef => ({
    src: [`/audio/sfx/${name}.mp3`, `/audio/sfx/${name}.ogg`],
    volume,
    minIntervalMs,
});

export const AudioConfig = {
    storageKey: 'pjx-echoes:audio:v1',
    defaultMasterVolume: 1,

    sfx: {
        lidar: sfx('lidar', 0.8, 150),
        bump: sfx('bump', 0.4, 180),
        torch: sfx('torch', 0.15, 100),
        anti: sfx('anti', 0.15, 100),
        sentry: sfx('sentry', 0.4 , 100),
        switch: sfx('switch', 0.5, 250),
        exit: sfx('exit', 1.0, 1000),
    } satisfies Record<SfxName, SfxDef>,

    /** Wall bumps: ignored below this speed into the wall (m/s). Player max speed is ~7. */
    bumpMinImpactSpeed: 1.5,

    music: {
        main: {
            src: ['/audio/music/main.mp3', '/audio/music/main.ogg'] as readonly string[],
            volume: 0.5,
        },
        /** Fade-in when Play on the intro screen first starts the music */
        introFadeInSeconds: 1.5,
        /** Music level (as a fraction of its volume) while a level transition covers the screen */
        duckLevel: 0.25,
        duckFadeSeconds: 0.5,
        restoreFadeSeconds: 1.0,
    },
};
