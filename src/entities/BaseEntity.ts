import * as PIXI from 'pixi.js';
import { Light } from '../core/Light';
import { ParticleEffect, ParticleEffectOptions } from '../particles/ParticleEffect';

export interface EntityContainers {
    containerForEntity: PIXI.Container;
    containerForParticleEffects: PIXI.Container;
}

export interface BaseEntityOptions {
    id: string;
    sprite: PIXI.Sprite;
    particleEffectOptions?: ParticleEffectOptions;
    particleEffectContainer?: PIXI.Container;
}

export class BaseEntity {
    public id: string;
    public sprite: PIXI.Sprite;
    public light?: Light; // Can be DynamicLight or StaticLight
    protected particleEffect?: ParticleEffect;

    constructor(options: BaseEntityOptions) {
        this.id = options.id;
        this.sprite = options.sprite;

        if (options.particleEffectOptions && options.particleEffectContainer) {
            this.particleEffect = new ParticleEffect(options.particleEffectOptions);
            options.particleEffectContainer.addChild(this.particleEffect.container);
        }
        // No light construction here!
    }

    update(deltaTime: number) {
        if (this.particleEffect) {
            // In case the sprite's position has changed
            // TODO May need to support future reach that the effect isn't positioned with the sprite
            this.particleEffect.setEffectPosition(
                this.sprite.x + this.sprite.width / 2,
                this.sprite.y + this.sprite.height / 2
            );
            this.particleEffect.update(deltaTime);
        }
        // No light update here!

        // TODO Any other base updating functionality
    }

    destroy() {
        this.particleEffect?.destroy();
        // Clean up other resources if needed
    }
}