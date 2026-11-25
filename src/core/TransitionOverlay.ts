import gsap from 'gsap';
import { TransitionConfig } from '../config/TransitionConfig';

/**
 * Full-viewport HTML/CSS overlay used for the boot reveal and level transitions.
 *
 * Lives in the DOM (outside the canvas) so it survives World resets, sits above the
 * bloom/CRT chain, and stays full-screen/centered on resize or rotation via CSS alone.
 * Animated with plain CSS properties through GSAP (no PixiPlugin involvement).
 *
 * It is created opaque and visible so the canvas never flashes before the first reveal.
 */
export class TransitionOverlay {
    private readonly root: HTMLDivElement;
    private readonly content: HTMLDivElement;
    private readonly depthEl: HTMLDivElement;
    private readonly subtitleEl: HTMLDivElement;

    private active = true;
    private lastFlavorIndex = -1;
    private tween: gsap.core.Timeline | null = null;

    constructor() {
        this.root = document.createElement('div');
        Object.assign(this.root.style, {
            position: 'fixed',
            inset: '0',
            width: '100%',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            opacity: '1',
            visibility: 'visible',
            pointerEvents: 'all',
            zIndex: '1000',
            touchAction: 'none',
            userSelect: 'none',
            fontFamily: TransitionConfig.fontFamily,
            color: '#fff',
            textAlign: 'center',
        });
        // Dynamic viewport height keeps it full-screen under mobile browser chrome
        if (typeof CSS !== 'undefined' && CSS.supports?.('height', '100dvh')) {
            this.root.style.height = '100dvh';
        }
        this.root.setAttribute('aria-hidden', 'true');

        this.content = document.createElement('div');
        Object.assign(this.content.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '0 1.5rem',
            opacity: '0', // Text stays hidden until fonts are ready (no fallback-font flash)
        });

        this.depthEl = document.createElement('div');
        Object.assign(this.depthEl.style, {
            fontSize: 'clamp(2.5rem, 10vmin, 6rem)',
            letterSpacing: '0.2em',
            textShadow: '0 0 18px rgba(50, 221, 255, 0.6)',
        });

        this.subtitleEl = document.createElement('div');
        Object.assign(this.subtitleEl.style, {
            fontSize: 'clamp(1rem, 3vmin, 1.5rem)',
            letterSpacing: '0.08em',
            opacity: '0.7',
            maxWidth: '32rem',
        });

        this.content.append(this.depthEl, this.subtitleEl);
        this.root.append(this.content);
        document.body.appendChild(this.root);
    }

    /** True while the overlay is visible or animating (input should be locked). */
    isActive(): boolean {
        return this.active;
    }

    /** Sets the depth label and picks the next rotating subtitle. */
    setContent(depth: number) {
        this.depthEl.textContent = `${TransitionConfig.depthLabel} ${depth}`;
        this.subtitleEl.textContent = this.nextFlavor();
    }

    /**
     * Boot reveal, step 1: backdrop is already opaque; fade the text in (call after fonts load).
     */
    revealText(depth: number, duration: number = TransitionConfig.bootTextFadeInDuration): Promise<void> {
        this.setContent(depth);
        return this.run(tl => this.textIn(tl, 0, duration));
    }

    /** Fades the overlay in over the game and animates the text in. */
    show(depth: number, duration: number = TransitionConfig.fadeInDuration): Promise<void> {
        this.setContent(depth);
        this.active = true;
        Object.assign(this.root.style, { visibility: 'visible', pointerEvents: 'all' });
        return this.run(tl => {
            tl.fromTo(this.root, { opacity: 0 }, { opacity: 1, duration, ease: 'power1.inOut' }, 0);
            this.textIn(tl, duration * 0.3, duration);
        });
    }

    /** Fades the overlay out; on completion it is hidden and never intercepts pointer events. */
    hide(duration: number = TransitionConfig.fadeOutDuration): Promise<void> {
        return this.run(tl => {
            tl.to(this.content, { opacity: 0, y: -8, duration: duration * 0.5, ease: 'power1.in' }, 0);
            tl.to(this.root, { opacity: 0, duration, ease: 'power1.inOut' }, 0);
        }).then(() => {
            Object.assign(this.root.style, { visibility: 'hidden', pointerEvents: 'none' });
            this.active = false;
        });
    }

    private textIn(tl: gsap.core.Timeline, at: number, duration: number) {
        tl.fromTo(
            this.content,
            { opacity: 0, y: 8, letterSpacing: '0.12em' },
            { opacity: 1, y: 0, letterSpacing: '0.02em', duration, ease: 'power2.out' },
            at,
        );
    }

    /** Runs a timeline, killing any in-flight one first; resolves on completion (callers sequence transitions, so none is interrupted). */
    private run(build: (tl: gsap.core.Timeline) => void): Promise<void> {
        this.tween?.kill();
        return new Promise<void>(resolve => {
            const tl = gsap.timeline({ onComplete: resolve });
            this.tween = tl;
            build(tl);
        });
    }

    private nextFlavor(): string {
        const pool = TransitionConfig.flavorText;
        let i = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && i === this.lastFlavorIndex) {
            i = (i + 1) % pool.length;
        }
        this.lastFlavorIndex = i;
        return pool[i];
    }
}
