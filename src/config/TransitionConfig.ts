// Timings (seconds) and copy for the level-transition / boot overlay.
export const TransitionConfig = {
    // Level exit: fade in -> (swap level while covered) -> hold -> fade out
    fadeInDuration: 0.5,
    holdDuration: 1.2,
    fadeOutDuration: 0.6,

    // Initial boot: backdrop is opaque from the start, text fades in once fonts load
    bootTextFadeInDuration: 0.5,
    bootHoldDuration: 1.2,
    bootFadeOutDuration: 0.8,

    depthLabel: 'DEPTH',

    // Rotating atmospheric subtitles (never repeats the same line back to back)
    flavorText: [
        'The dark remembers your footsteps.',
        'Something stirs below.',
        'Listen for the echo.',
        'The walls breathe in the silence.',
        'Light is a promise. Keep it.',
        'Deeper, where the sound goes to die.',
        'The cave has not finished with you.',
        'Every passage forgets its way home.',
    ],

    fontFamily: 'Jersey10, UbuntuMono, monospace',
} as const;
