import * as PIXI from 'pixi.js';
import { InputManager } from '../input/InputManager';
import { ParticleEffect } from '../particles/ParticleEffect';
import { ParticleEffectManager } from '../particles/ParticleEffectManager';

export class EffectsWorld {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private activeTrailEffect: ParticleEffect | null = null;

    private inputManager: InputManager;
    
    constructor(app: PIXI.Application) {
        this.app = app;  
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        // Initialize input manager
        this.inputManager = new InputManager(app.canvas);

        this.activeTrailEffect = ParticleEffectManager.instance.playEffect(this.container, "Explosion", {x: 0, y: 0});
    }  

    update(deltaTime: number) {
        // Update the active trail effect's position based on pointer position
        const pointerState = this.inputManager.getPointerState();
        if (this.activeTrailEffect) {
            this.activeTrailEffect.setPosition(pointerState.screen.x, pointerState.screen.y);
        }

        ParticleEffectManager.instance.update(deltaTime);
    }
}
