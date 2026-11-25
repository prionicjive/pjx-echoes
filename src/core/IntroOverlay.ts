import gsap from 'gsap';
import './intro.css';
import { Config } from '../config/Config';
import type { SkinPreset } from '../config/SkinsConfig';
import { SkinManager } from './SkinManager';
import { AudioManager } from '../audio/AudioManager';

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

// Static, trusted markup (no user data); 24x24 viewBox, drawn with currentColor.
const ICON_SOUND_ON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/>' +
    '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_SOUND_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/>' +
    '<path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

const ARROW_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K, className: string, text?: string
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/**
 * Title + cosmetics screen shown on boot. Plain DOM/CSS (see intro.css) animated with GSAP;
 * it sits above TransitionOverlay and the canvas, over a dim scrim so the live cave and the
 * selected skin's look (ball, light, trail, bloom/CRT) preview behind it.
 *
 * Responsibilities: pick a skin (persisted by SkinManager), toggle mute, press Play.
 * It does NOT touch the world, input or music itself: Play invokes the `onPlay` callback
 * synchronously inside the user gesture (required for iOS/Safari audio), and the owner then
 * calls dismiss() and unlocks gameplay.
 *
 * Keyboard: Enter/Space starts the game from anywhere on the screen, except when the Mute
 * button has focus (there they activate it). Arrow keys move between skin cards.
 */
export class IntroOverlay {
    private readonly root: HTMLDivElement;
    private readonly items: HTMLElement[];
    private readonly muteBtn: HTMLButtonElement;
    private readonly playBtn: HTMLButtonElement;
    private readonly titleEl: HTMLElement;
    private readonly cards = new Map<string, HTMLButtonElement>();
    private readonly presets: readonly SkinPreset[] = Config.Skins.presets;

    private started = false;
    private tween: gsap.core.Timeline | null = null;
    private unsubscribeMute: (() => void) | null = null;

    constructor(depth: number, private readonly onPlay: () => void) {
        const C = Config.Intro;

        this.root = el('div', 'echoes-intro');
        this.root.style.fontFamily = C.fontFamily;
        this.root.style.setProperty('--scrim-center', String(C.scrimCenterAlpha));
        this.root.style.setProperty('--scrim-edge', String(C.scrimEdgeAlpha));
        this.root.setAttribute('role', 'dialog');
        this.root.setAttribute('aria-label', C.title);

        const panel = el('div', 'echoes-intro__panel');

        this.titleEl = el('h1', 'echoes-intro__title echoes-intro__item', C.title);
        const tagline = el('p', 'echoes-intro__tagline echoes-intro__item', C.tagline);

        const skinsWrap = el('div', 'echoes-intro__skins-wrap echoes-intro__item');
        const skinsLabel = el('p', 'echoes-intro__skins-label', C.skinsLabel);
        skinsLabel.id = 'echoes-skins-label';
        const skins = el('div', 'echoes-intro__skins');
        skins.setAttribute('role', 'radiogroup');
        skins.setAttribute('aria-labelledby', skinsLabel.id);
        for (const skin of this.presets) {
            const card = this.buildCard(skin);
            this.cards.set(skin.id, card);
            skins.append(card);
        }
        skinsWrap.append(skinsLabel, skins);

        this.playBtn = el('button', 'echoes-intro__play echoes-intro__item',
            SkinManager.instance.getLevelsCompleted() > 0 ? `${C.continueLabel} ${depth}` : C.playLabel);
        this.playBtn.type = 'button';
        this.playBtn.addEventListener('click', () => this.play());

        const hint = el('p', 'echoes-intro__hint echoes-intro__item', C.keyboardHint);

        this.muteBtn = el('button', 'echoes-intro__mute echoes-intro__item');
        this.muteBtn.type = 'button';
        this.muteBtn.addEventListener('click', () => {
            if (!this.started) AudioManager.instance.toggleMute();
        });

        panel.append(this.titleEl, tagline, skinsWrap, this.playBtn, hint);
        this.root.append(panel, this.muteBtn);
        document.body.appendChild(this.root);

        this.items = [this.titleEl, tagline, skinsWrap, this.playBtn, hint, this.muteBtn];

        this.syncSelection();
        this.renderMute(AudioManager.instance.isMuted());
        // Stays in sync with the M key and persisted state
        this.unsubscribeMute = AudioManager.instance.onMuteChanged(muted => this.renderMute(muted));
        window.addEventListener('keydown', this.onKeyDown);
    }

    /** Fades the content in (call once fonts are loaded). */
    reveal(): Promise<void> {
        const C = Config.Intro;
        return this.run(tl => {
            tl.fromTo(
                this.items,
                { opacity: 0, y: 14 },
                { opacity: 1, y: 0, duration: C.revealDuration, stagger: C.revealStagger, ease: 'power2.out' },
                0,
            );
        });
    }

    /**
     * Fades the content and scrim out onto the cave. The overlay keeps capturing pointer events
     * until the fade completes (so nothing leaks to the canvas), then hides itself with
     * pointer-events: none and leaves the DOM.
     */
    dismiss(): Promise<void> {
        const duration = Config.Intro.dismissDuration;
        this.teardownListeners();
        (document.activeElement as HTMLElement | null)?.blur?.();
        return this.run(tl => {
            tl.to(this.items, { opacity: 0, y: -8, duration: duration * 0.5, ease: 'power1.in' }, 0);
            tl.to(this.root, { opacity: 0, duration, ease: 'power1.inOut' }, 0);
        }).then(() => {
            Object.assign(this.root.style, { visibility: 'hidden', pointerEvents: 'none' });
            this.root.setAttribute('inert', '');
            this.root.remove();
        });
    }

    // ---- Skin picker -----------------------------------------------------------------------

    private buildCard(skin: SkinPreset): HTMLButtonElement {
        const card = el('button', 'echoes-skin');
        card.type = 'button';
        card.dataset.skinId = skin.id;
        card.setAttribute('role', 'radio');
        card.setAttribute('aria-label', `${skin.name}, ${skin.vibe}`);
        card.style.setProperty('--ball', hex(skin.ballColor));
        card.style.setProperty('--light-a', hex(skin.lightStart));
        card.style.setProperty('--light-b', hex(skin.lightEnd));
        card.style.setProperty('--trail-a', hex(skin.trailStart));
        card.style.setProperty('--trail-b', hex(skin.trailEnd));

        const preview = el('span', 'echoes-skin__preview');
        preview.append(el('span', 'echoes-skin__trail'), el('span', 'echoes-skin__ball'));
        card.append(
            preview,
            el('span', 'echoes-skin__name', skin.name),
            el('span', 'echoes-skin__vibe', skin.vibe),
        );

        card.addEventListener('click', () => this.select(skin.id));
        return card;
    }

    /** Persists the skin (SkinManager) and previews it live: World restyles the player and filters. */
    private select(id: string, focus = false) {
        if (this.started) return;
        SkinManager.instance.setSkin(id);
        this.syncSelection();
        if (focus) this.cards.get(id)?.focus();
    }

    /** Reflects the active skin in the radio state, roving tabindex, and title/Play accent color. */
    private syncSelection() {
        const active = SkinManager.instance.getActiveSkin();
        this.cards.forEach((card, id) => {
            const selected = id === active.id;
            card.setAttribute('aria-checked', String(selected));
            card.tabIndex = selected ? 0 : -1;
        });
        this.root.style.setProperty('--accent', hex(active.lightStart));
    }

    // ---- Mute ------------------------------------------------------------------------------

    private renderMute(muted: boolean) {
        this.muteBtn.innerHTML = muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
        this.muteBtn.setAttribute('aria-pressed', String(muted));
        this.muteBtn.setAttribute('aria-label', muted ? Config.Intro.unmuteLabel : Config.Intro.muteLabel);
    }

    // ---- Play / keyboard -------------------------------------------------------------------

    private play() {
        if (this.started) return;
        this.started = true;
        this.playBtn.setAttribute('aria-disabled', 'true');
        this.onPlay(); // Synchronous, inside the user gesture
    }

    private readonly onKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;

        if (e.key === 'Enter' || e.key === ' ') {
            // Mute keeps its native Enter/Space activation; everywhere else starts the game
            // (including when a skin card has focus after clicking it).
            if (target === this.muteBtn) return;
            e.preventDefault(); // Also stops a focused button's own click from firing
            if (!e.repeat) this.play();
            return;
        }

        const step = ARROW_STEPS[e.key];
        const card = target?.closest?.('.echoes-skin');
        if (step !== undefined && card && !this.started) {
            e.preventDefault();
            const index = this.presets.findIndex(p => p.id === (card as HTMLElement).dataset.skinId);
            const next = this.presets[(index + step + this.presets.length) % this.presets.length];
            this.select(next.id, true);
        }
    };

    private teardownListeners() {
        window.removeEventListener('keydown', this.onKeyDown);
        this.unsubscribeMute?.();
        this.unsubscribeMute = null;
    }

    /** Runs a timeline, killing any in-flight one first; resolves on completion. */
    private run(build: (tl: gsap.core.Timeline) => void): Promise<void> {
        this.tween?.kill();
        return new Promise<void>(resolve => {
            const tl = gsap.timeline({ onComplete: resolve });
            this.tween = tl;
            build(tl);
        });
    }
}
