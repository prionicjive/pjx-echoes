// ParticleEffectPreviewer.ts
// Handles initialization, the main loop, and delegation to the EffectsWorld.
// Everything flows through here!

import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { PixiPlugin } from "gsap/PixiPlugin";
import { Config } from '../config/Config.ts';
import { EffectsWorld } from './EffectsWorld.ts';

export class ParticleEffectPreviewer {
    private app: PIXI.Application | null = null;
    private world: EffectsWorld | null = null;

    constructor() {}

    /**
     * Initializes the PIXI application, loads all required assets,
     * and starts the main loop.
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

        // Register the GSAP Pixi plugin
        gsap.registerPlugin(PixiPlugin);

        // Give the plugin a reference to the PIXI object
        PixiPlugin.registerPIXI(PIXI);

        // Preload textures before starting the loop to avoid rendering glitches.
        await this.loadAssets();

        // Set up the resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Create the effects world
        this.world = new EffectsWorld(this.app);

        // TODO Handle additional setup if needed

        // Lastly, start the main loop
        this.app.ticker.add(this.update.bind(this, this.app.ticker.deltaMS));
    }

    handleResize() {
        if (!this.app) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.app.renderer.resize(width, height);
        if (this.world) {
            //this.world.onResize(width, height);
        }
    }

    /**
     * Loads all texture assets needed for the game before gameplay begins.
     * @async
     * @returns {Promise<void>}
     */
    async loadAssets() {
        // Load textures
        // TODO Refactor how assets are fetched

        await PIXI.Assets.load(Config.Textures.Particles.ring);
        await PIXI.Assets.load(Config.Textures.Particles.ringSoft);
        await PIXI.Assets.load(Config.Textures.Particles.circle);
        await PIXI.Assets.load(Config.Textures.Particles.circleSoft);
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


