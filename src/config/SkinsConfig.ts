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
}

const CRT_OFF: CrtPreset = { ...FiltersConfig.crt, enabled: false };

const CyanSkin: SkinPreset = {
    id: 'cool-cyan',
    name: 'Cool Cyan',
    ballColor: 0x32ddff,
    lightStart: 0x55aaff,
    lightEnd: 0x77edff,
    trailStart: 0x32ddff,
    trailEnd: 0xff13bb,
    bloom: { enabled: true, threshold: FiltersConfig.bloom.threshold, bloomScale: FiltersConfig.bloom.bloomScale },
    crt: { ...FiltersConfig.crt, enabled: true }, // The original look
};

const AmberSkin: SkinPreset = {
    id: 'warm-amber',
    name: 'Warm Amber',
    ballColor: 0xffb02e,
    lightStart: 0xff8a1f,
    lightEnd: 0xffd27a,
    trailStart: 0xffb02e,
    trailEnd: 0xc2300a,
    bloom: { enabled: true, threshold: 0.55, bloomScale: 0.8 }, // Subtle
    crt: CRT_OFF,
};

const NeonSkin: SkinPreset = {
    id: 'retro-neon',
    name: 'Retro Neon CRT',
    ballColor: 0xff2bd6,
    lightStart: 0xff2bd6,
    lightEnd: 0x2bffb0,
    trailStart: 0xff2bd6,
    trailEnd: 0x2bffb0,
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
};

const VioletSkin: SkinPreset = {
    id: 'deep-violet',
    name: 'Deep Violet',
    ballColor: 0x9a4dff,
    lightStart: 0x7a2bff,
    lightEnd: 0xc78cff,
    trailStart: 0x9a4dff,
    trailEnd: 0x2a0a66,
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
};

const SolarSkin: SkinPreset = {
    id: 'high-bloom-solar',
    name: 'High-Bloom Solar',
    ballColor: 0xffe680,
    // Keep light colors saturated, never near-white: lights render additively and the bloom
    // extract is a hard luminance cutoff, so near-white lights overlap into huge blown-out blooms.
    lightStart: 0xffd24a,
    lightEnd: 0xffb347,
    trailStart: 0xffe680,
    trailEnd: 0xff7a00,
    // Strongest scale of the five, but same threshold as the others. A low threshold (<0.5) or
    // scale above ~1.3 makes nearby additive lights swell and merge.
    bloom: { enabled: true, threshold: 0.5, bloomScale: 1.2 },
    crt: CRT_OFF,
};

export const SkinsConfig = {
    /** Skin used when nothing valid is saved. */
    defaultSkinId: CyanSkin.id,
    /** Cycle order for the live-preview key. */
    presets: [CyanSkin, AmberSkin, NeonSkin, VioletSkin, SolarSkin] as readonly SkinPreset[],
};
