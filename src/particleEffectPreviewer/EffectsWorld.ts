import * as PIXI from 'pixi.js';
import { ParticleEffectManager } from '../particles/ParticleEffectManager';

export class EffectsWorld {
    private app: PIXI.Application;
    private container: PIXI.Container;

    constructor(app: PIXI.Application) {
        this.app = app;  
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        ParticleEffectManager.instance.playEffect(this.container, "Explosion", {x: 250, y: 250}, 10);
    }  

    update(deltaTime: number) {
        ParticleEffectManager.instance.update(deltaTime);
    }
}
