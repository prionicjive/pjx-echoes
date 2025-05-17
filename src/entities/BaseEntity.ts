import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Light } from '../light/Light';
import { LightManager } from '../light/LightManager';
import { ParticleEffect } from '../particles/ParticleEffect';
import { ParticleEffectManager } from '../particles/ParticleEffectManager';
import { EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { Config } from '../config/Config';

export interface EntityContainers {
    containerForEntity: PIXI.Container;
    containerForParticleEffects?: PIXI.Container;
}

export interface BaseEntityOptions {
    type: EntityType;
    sprite: PIXI.Sprite;
    body?: planck.Body;
    light?: Light;
    particleEffect?: ParticleEffect;
    containers: EntityContainers;
}

export interface EntityUserData {
    type: EntityType;
    entity?: BaseEntity;
    body?: planck.Body;
}

export abstract class BaseEntity {
    public id: string;
    public type: EntityType;
    public sprite: PIXI.Sprite;
    public body?: planck.Body;
    public light?: Light; // Can be DynamicLight or StaticLight
    public particleEffect?: ParticleEffect;
    public containers: EntityContainers;

    constructor(options: BaseEntityOptions) {
        this.type = options.type;
        this.id = EntityUtils.generateRandomId(this.type);
        this.sprite = options.sprite;
        this.containers = options.containers;

        // Add sprite to proper container
        options.containers.containerForEntity.addChild(this.sprite);

        // If provided, store body up
        if (options.body) {
            this.body = options.body;

            // Set user data with a self-referencing data
            this.body.setUserData({
                type: this.type,
                entity: this,
                body: this.body
            } as EntityUserData);
        }

        // If provided, store and set light up for management
        if (options.light) {
            this.light = options.light;
            LightManager.instance.addLight(this.light);
        }

        // If provided, store and set up particle effect for management
        if (options.particleEffect && this.containers.containerForParticleEffects) {
            this.particleEffect = options.particleEffect;
            this.containers.containerForParticleEffects.addChild(this.particleEffect.container);
            ParticleEffectManager.instance.addEffect(this.particleEffect);
        }
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
            LightManager.instance.removeLight(this.light);
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
            LightManager.instance.gentlyRemoveLight(this.light);
        }

        // Gently remove particle by having it stop emitting before destroying
        if (this.particleEffect) {
            ParticleEffectManager.instance.gentlyRemoveEffect(this.particleEffect);
        }
    }
}