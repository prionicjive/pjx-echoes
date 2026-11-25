// Timings (seconds) and copy for the level-transition overlay.
// (The opening reveal is handled by the intro screen: see IntroConfig.)
export const TransitionConfig = {
    // Level exit: fade in -> (swap level while covered) -> hold -> fade out
    fadeInDuration: 0.5,
    holdDuration: 1.2,
    fadeOutDuration: 0.6,

    depthLabel: 'DEPTH',

    // Rotating atmospheric subtitles (never repeats the same line back to back)
    flavorText: [
        'The dark remembers your footsteps.',
        'Something stirs below.',
        'How deep does it go? No one knows.',
        'The walls breathe in the silence.',
        'Light is a promise. Keep it.',
        'Deeper, where the sound goes to die.',
        'The cave has not finished with you.',
        'Every passage forgets its way home.',
    ],

    fontFamily: 'Jersey10, UbuntuMono, monospace',
} as const;
