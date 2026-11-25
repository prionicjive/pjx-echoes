// Game.ts
// Main game controller for pjx-echoes.
// Handles initialization, the main loop, and delegation to the World.
// Everything flows through here!

import gsap from 'gsap';
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from 'pixi.js';
import { Config } from '../config/Config.ts';
import { World } from './World.ts';
import { TransitionOverlay } from './TransitionOverlay.ts';
import { IntroOverlay } from './IntroOverlay.ts';
import { SkinManager } from './SkinManager.ts';
import { AudioManager } from '../audio/AudioManager.ts';

export class Game {
    private app: PIXI.Application | null = null;
    private world: World | null = null;
    private overlay: TransitionOverlay | null = null;
    private intro: IntroOverlay | null = null;

    constructor() {}

    /**
     * Initializes the PIXI application, loads all required assets,
     * and starts the main game loop.
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        // Set up PIXI application
        this.app = new PIXI.Application();
        await this.app.init({ 
            width: window.innerWidth, 
            height: window.innerHeight, 
            backgroundColor: 0x000000
        });
        document.body.appendChild(this.app.canvas);

        // Opaque black cover immediately; its text stays hidden until fonts are loaded
        this.overlay = new TransitionOverlay();

        // Register the GSAP Pixi plugin
        gsap.registerPlugin(PixiPlugin);

        // Give the plugin a reference to the PIXI object
        PixiPlugin.registerPIXI(PIXI);

        // Preload textures before starting the game loop to avoid rendering glitches.
        // TODO Load any other assets possibly need by the game
        await this.loadAssets();

        // Start loading SFX and arm the first-gesture audio unlock (never blocks or throws)
        AudioManager.instance.init();

        // Set up the resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Create the game world. It builds the opening cave but stays locked (input discarded,
        // physics held) until the intro's Play button calls world.startPlay().
        this.world = new World(this.app, this.overlay);

        // Start the main loop so the cave renders behind the intro
        this.app.ticker.add((ticker) => this.update(ticker.deltaMS));

        // Intro / skin picker over a dim scrim. The opaque black cover fades out beneath it.
        this.intro = new IntroOverlay(
            SkinManager.instance.getLevelsCompleted() + 1,
            () => this.handlePlay()
        );
        void this.overlay.hide(Config.Intro.underlayFadeDuration);
        void this.intro.reveal();
    }

    /**
     * Play pressed. Runs synchronously inside the user gesture: audio is unlocked by the
     * AudioManager's own gesture listener, and the music starts here (never on the intro itself).
     * The intro then fades onto the already-built cave and gameplay input unlocks.
     */
    private handlePlay() {
        AudioManager.instance.enableMusic(Config.Audio.music.introFadeInSeconds);
        void this.intro?.dismiss().then(() => {
            this.intro = null;
            this.world?.startPlay();
        });
    }

    handleResize() {
        if (!this.app) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.app.renderer.resize(width, height);
        if (this.world) {
            this.world.onResize(width, height);
        }
    }

    /**
     * Loads all texture assets needed for the game before gameplay begins.
     * @async
     * @returns {Promise<void>}
     */
    async loadAssets() {
        // Load spritesheet and related textures
        await PIXI.Assets.load(Config.Spritesheet.path);

        // Load fonts
        PIXI.Assets.addBundle("fonts", [
            {
                alias: "Jersey10",
                src: "/assets/fonts/Jersey10.ttf"
            }, {
                alias: "UbuntuMono",
                src: "/assets/fonts/UbuntuMono.ttf"
            }
        ]);
        await PIXI.Assets.loadBundle("fonts");
    }

    /**
     * Called every frame. Updates the game world
     * @param {number} deltaMS - Time since the last frame, in milliseconds.
     */
    update(deltaMS: number) {
        const deltaTime = deltaMS / 1000;

        if (!this.world) return;
        
        this.world.update(deltaTime);
    }
}
