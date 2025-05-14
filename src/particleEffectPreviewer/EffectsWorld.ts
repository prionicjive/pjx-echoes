import * as PIXI from 'pixi.js';
import { InputManager } from '../input/InputManager';
import { ParticleEffect } from '../particles/ParticleEffect';
import { ParticleEffectManager } from '../particles/ParticleEffectManager';

export class EffectsWorld {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private viewportWidth: number;
    private viewportHeight: number;

    private activeTrailEffect: ParticleEffect | null = null;

    private inputManager: InputManager;
    
    constructor(app: PIXI.Application) {
        this.app = app;  
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        // Initialize input manager
        this.inputManager = new InputManager(app.canvas);

        this.activeTrailEffect = ParticleEffectManager.instance.playEffect(this.container, "SentryTrail", {x: 0, y: 0});
    }  

    update(deltaTime: number) {
        // Update the active trail effect's position based on pointer position
        const pointerState = this.inputManager.getPointerState();
        if (this.activeTrailEffect) {
            this.activeTrailEffect.setPosition(pointerState.screen.x, pointerState.screen.y);
        }

        // Create certain effects when needed (e.g. on key press)
        if (this.inputManager.getKeysState().keys.get("1")?.justPressed) {
            console.log("Key 1 pressed - SPAWN TIME");
            ParticleEffectManager.instance.playEffect(this.container, "BlueFlame", {x: Math.random() * this.viewportWidth, y: Math.random() * this.viewportHeight}, 5);
        }

        if (this.inputManager.getKeysState().keys.get("2")?.justPressed) {
            console.log("Key 2 pressed - SPAWN TIME");
            ParticleEffectManager.instance.playEffect(this.container, "Explosion", {x: Math.random() * this.viewportWidth, y: Math.random() * this.viewportHeight}, 0.5);
        }

        this.inputManager.update();
        ParticleEffectManager.instance.update(deltaTime);
    }

    onResize(width: number, height: number) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }
}
