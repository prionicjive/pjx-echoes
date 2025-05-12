import * as PIXI from 'pixi.js';
import { Light } from '../light/Light';
import { ParticleEffect, ParticleEffectOptions } from '../particles/ParticleEffect';
import * as planck from 'planck';
import { ParticleEffectManager } from '../particles/ParticleEffectManager';
import { LightManager } from '../light/LightManager';

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

export abstract class BaseEntity {
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

            // Add to the manager
            ParticleEffectManager.instance.addEffect(this.particleEffect);
        }
        // No light construction here!
    }

    destroy() {
        // Instantly remove the sprite from the container
        this.containers.containerForEntity.removeChild(this.sprite);

        // Destroy the body
        if (this.body && this.body.getWorld()) {
            this.body.getWorld().destroyBody(this.body);
        }

        // Immediately remove light from LightManager
        if (this.light) {
            LightManager.instance.removeStaticLight(this.light);
        }

        // Immediately remove particle by having it stop emitting before destroying
        if (this.particleEffect) {
            ParticleEffectManager.instance.removeEffect(this.particleEffect);
        }
    }

    gentlyDestroy() {
        // Instantly remove the sprite from the container
        this.containers.containerForEntity.removeChild(this.sprite);

        // Gently destroy the body
        if (this.body && this.body.getWorld()) {
            this.body.getWorld().destroyBody(this.body);
        }

        // Gently remove light from LightManager
        if (this.light) {
            LightManager.instance.gentlyRemoveStaticLight(this.light);
        }

        // Gently remove particle by having it stop emitting before destroying
        if (this.particleEffect) {
            ParticleEffectManager.instance.gentlyRemoveEffect(this.particleEffect);
        }
    }
}