import * as PIXI from 'pixi.js';
import { Light } from '../core/Light';
import { ParticleEffect, ParticleEffectOptions } from '../particles/ParticleEffect';
import * as planck from 'planck';

export interface EntityContainers {
    containerForEntity: PIXI.Container;
    containerForParticleEffects?: PIXI.Container;
}

export interface BaseEntityOptions {
    id: string;
    sprite: PIXI.Sprite;
    body?: planck.Body;
    particleEffectOptions?: ParticleEffectOptions;
    containers: EntityContainers;
}

export class BaseEntity {
    public id: string;
    public sprite: PIXI.Sprite;
    public body: planck.Body;
    public light?: Light; // Can be DynamicLight or StaticLight
    public particleEffect?: ParticleEffect;
    public containers: EntityContainers;

    constructor(options: BaseEntityOptions) {
        this.id = options.id;
        this.sprite = options.sprite;
        this.body = options.body!;
        this.containers = options.containers;

        // Add sprite to proper container
        options.containers.containerForEntity.addChild(this.sprite);

        // Set up particle effect (if needed)
        if (options.particleEffectOptions && this.containers.containerForParticleEffects) {
            this.particleEffect = new ParticleEffect(options.particleEffectOptions);
            this.containers.containerForParticleEffects.addChild(this.particleEffect.container);
        }
        // No light construction here!
    }

    update(deltaTime: number) {
        if (this.particleEffect) {
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
        this.containers.containerForEntity.removeChild(this.sprite);
        this.light?.destroy();
        this.particleEffect?.destroy();
        // Clean up other resources if needed
    }
}