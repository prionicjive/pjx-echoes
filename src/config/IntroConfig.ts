import { TransitionConfig } from './TransitionConfig';

// Copy, timings (seconds) and look of the title / skin-picker screen shown on boot.
export const IntroConfig = {
    title: 'ECHOES',
    tagline: 'Navigate the unknown and unseen.',
    skinsLabel: 'Choose your light',

    playLabel: 'Play',
    /** Shown instead of playLabel once the player has completed at least one level ("Continue — Depth N"). */
    continueLabel: 'Continue — Depth',
    keyboardHint: 'Press Enter or Space',

    muteLabel: 'Mute sound',
    unmuteLabel: 'Unmute sound',

    /** The black boot cover fades out underneath the intro over this long, revealing the dim cave. */
    underlayFadeDuration: 0.6,
    /** Intro content fades/rises in, staggered per element. */
    revealDuration: 0.7,
    revealStagger: 0.12,
    /** Play: intro content + scrim fade out onto the opening cave; input unlocks when it completes. */
    dismissDuration: 0.9,

    /** Dim scrim over the live cave (0..1 alpha at the center / edges of the screen). */
    scrimCenterAlpha: 0.62,
    scrimEdgeAlpha: 0.88,

    fontFamily: TransitionConfig.fontFamily,
} as const;
