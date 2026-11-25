import { FiltersConfig } from './FiltersConfig';

/** Live-mutable CRT parameters. All fields are required so switching skins never leaks old values. */
export interface CrtPreset {
    enabled: boolean;
    curvature: number;
    lineWidth: number;
    lineContrast: number;
    vignetting: number;
    vignettingAlpha: number;
    vignettingBlur: number;
    noise: number;
    noiseSize: number;
}

/**
 * Live-mutable AdvancedBloom parameters (see FiltersConfig.bloom for the fixed ones).
 * `threshold` (0..1): only pixels brighter than this bloom — higher keeps more of the scene dark.
 * `bloomScale`: intensity of the added glow.
 */
export interface BloomPreset {
    enabled: boolean;
    threshold: number;
    bloomScale: number;
}

/** A cosmetic bundle: player visuals + post-processing look. */
export interface SkinPreset {
    id: string;
    name: string;
    /** Player sprite tint (the sprite texture is pure white, so this is the true color). */
    ballColor: number;
    /** Player light color oscillation range. */
    lightStart: number;
    lightEnd: number;
    /** Player particle trail color over its lifetime. */
    trailStart: number;
    trailEnd: number;
    bloom: BloomPreset;
    crt: CrtPreset;
    /** Short filter-style label shown on the skin picker card (e.g. "Bloom + CRT"). */
    vibe: string;
}

// Contrast rule for skin colors: the ball, light start and trail start must stay visually
// distinct (CIELAB ΔE ≳ 30, or a clear hue gap) from every world entity color — Torch gold,
// Anti pink/red, Sentry purple, Switch/Gate blue, Exit green/aqua. The hue wheel is nearly full,
// so the clear space is cool cyan, orange, and low-chroma near-whites. Skins only ever recolor the
// player: never change entity/pickup colors to make room for a skin.

const CRT_OFF: CrtPreset = { ...FiltersConfig.crt, enabled: false };

const CyanSkin: SkinPreset = {
    id: 'cool-cyan',
    name: 'Cool Cyan',
    ballColor: 0x32ddff,
    lightStart: 0x55aaff,
    lightEnd: 0x77edff,
    trailStart: 0x32ddff,
    trailEnd: 0x0a4a7a, // Deep ocean (was Anti-pink 0xff13bb)
    bloom: { enabled: true, threshold: FiltersConfig.bloom.threshold, bloomScale: FiltersConfig.bloom.bloomScale },
    crt: { ...FiltersConfig.crt, enabled: true }, // The original look
    vibe: 'Bloom + CRT',
};

// Orange: the clear gap between Torch gold and Anti red.
const EmberSkin: SkinPreset = {
    id: 'ember',
    name: 'Ember',
    ballColor: 0xff7a3d,
    lightStart: 0xff6a2b,
    lightEnd: 0xffa066,
    trailStart: 0xff7a3d,
    trailEnd: 0x5a1a00,
    bloom: { enabled: true, threshold: 0.55, bloomScale: 0.8 }, // Subtle
    crt: CRT_OFF,
    vibe: 'Soft Bloom',
};

const NeonSkin: SkinPreset = {
    id: 'retro-neon',
    name: 'Retro Neon CRT',
    ballColor: 0xff2bd6,
    lightStart: 0xff2bd6,
    lightEnd: 0xffd6f5, // Pale pink (was mint 0x2bffb0, which matched the Exit light)
    trailStart: 0xff2bd6,
    trailEnd: 0xffd6f5,
    bloom: { enabled: true, threshold: 0.5, bloomScale: 0.9 },
    crt: {
        enabled: true,
        curvature: 3,
        lineWidth: 1.2,
        lineContrast: 0.25,
        vignetting: 0.25,
        vignettingAlpha: 0.6,
        vignettingBlur: 0.35,
        noise: FiltersConfig.crt.noise,
        noiseSize: 1,
    },
    vibe: 'Bloom + Scanlines',
};

// Near-white ball with a cool pale-blue light: low chroma keeps it clear of Sentry purple and Switch blue.
const GhostSkin: SkinPreset = {
    id: 'ghost',
    name: 'Ghost',
    ballColor: 0xeef3ff,
    lightStart: 0x9fb4ff,
    lightEnd: 0xd0dcff,
    trailStart: 0xeef3ff,
    trailEnd: 0x3a4a80,
    bloom: { enabled: true, threshold: 0.5, bloomScale: 1 },
    crt: {
        enabled: true,
        curvature: 0,
        lineWidth: 0.1,
        lineContrast: 0.08,
        vignetting: 0.35,
        vignettingAlpha: 0.8,
        vignettingBlur: 0.4,
        noise: FiltersConfig.crt.noise,
        noiseSize: 1,
    },
    vibe: 'Bloom + Vignette',
};

const SolarSkin: SkinPreset = {
    id: 'high-bloom-solar',
    name: 'High-Bloom Solar',
    // Warm-white ball (pale enough to stay clear of Torch gold). Lights stay tinted, never
    // near-white: they render additively and the bloom extract is a hard luminance cutoff, so
    // near-white lights overlap into huge blown-out blooms.
    ballColor: 0xfff4dc,
    lightStart: 0xffd9a0,
    lightEnd: 0xffc070,
    trailStart: 0xfff4dc,
    trailEnd: 0xff8a3d,
    // Strongest scale of the five, but same threshold as the others. A low threshold (<0.5) or
    // scale above ~1.3 makes nearby additive lights swell and merge.
    bloom: { enabled: true, threshold: 0.5, bloomScale: 1.2 },
    crt: CRT_OFF,
    vibe: 'High Bloom',
};

export const SkinsConfig = {
    /** Skin used when nothing valid is saved. */
    defaultSkinId: CyanSkin.id,
    /** Cycle order for the live-preview key, and display order on the intro skin picker. */
    presets: [CyanSkin, EmberSkin, NeonSkin, GhostSkin, SolarSkin] as readonly SkinPreset[],
};
