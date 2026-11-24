export const FiltersConfig = {
    crt: {
        curvature: 0,
        lineWidth: 0.1,
        lineContrast: 0.1,
        vignetting: 0,
        vignettingAlpha: 1,
        vignettingBlur: 0.3,
        // CRT noise is added to every pixel (including black), so pure #000 is impossible while
        // noise > 0. Kept low so darks stay crisp.
        noise: 0.087,
        noiseSize: 1,
    },
    // AdvancedBloomFilter: only pixels above `threshold` bloom, so darks stay untouched.
    // `kernels` (fixed, applied after construction) are the Kawase blur passes: one pass each,
    // sampling 4 diagonal taps at (kernel + 0.5)px. They MUST be contiguous (0,1,2,3...) so the
    // summed offsets form an even lattice. Auto-generated kernels from `blur`/`quality` (e.g.
    // [8, 5.3, 2.7]) leave gaps and render as blocky, repeating squares around bright lights.
    // Cost: kernels.length passes + extract + composite. Wider glow = append the next integer
    // (e.g. [0,1,2,3,4]) at the price of one more full-res pass.
    // `threshold` and `bloomScale` are live-mutable and are what skins vary.
    // IMPORTANT: never set `resolution` below 1 on any filter in worldContainer.filters. PIXI
    // renders the whole filter chain at the MINIMUM resolution of all its filters, so a
    // half-res bloom blurs and shimmers the entire world.
    bloom: {
        threshold: 0.5,
        bloomScale: 1,
        brightness: 1,
        kernels: [0, 1, 2, 3],
    },
} as const;
