import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { DynamicLight, Light } from '../light/Light';
import { LightManager } from '../light/LightManager';
import { ParticleEffect } from '../particles/ParticleEffect';
import { ParticleEffectManager } from '../particles/ParticleEffectManager';
import { EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { Config } from '../config/Config';
import { Point } from '../utils/types';
import { LevelContext } from '../level/LevelContext';
import { EntityPreset } from '../config/EntitiesConfig';
import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';

export interface EntityContainers {
    containerForEntity: PIXI.Container;
    containerForParticleEffects?: PIXI.Container;
}

export interface BaseEntityOptions {
    type: EntityType;
    containers: EntityContainers;
    levelContext: LevelContext
    spawnPoint: Point;
    preset: EntityPreset;
}

export interface EntityUserData {
    type: EntityType;
    entity?: BaseEntity;
    body?: planck.Body;
}

export abstract class BaseEntity {
    public id: string;
    public type: EntityType;
    private preset: EntityPreset;
    public sprite?: PIXI.Sprite;
    public body?: planck.Body;
    public light?: Light; // Can be DynamicLight or StaticLight
    public particleEffect?: ParticleEffect;
    public containers: EntityContainers;

    constructor(options: BaseEntityOptions) {
        this.type = options.type;
        this.id = EntityUtils.generateRandomId(this.type);
        this.containers = options.containers;

        // Get the preset for the entity type
        this.preset = options.preset;
        if (!this.preset) {
            throw new Error(`No preset found for entity type: ${this.type}`);
        }
        
        // If provided, set up and store the sprite
        if (this.preset.sprite) {
            this.sprite = SpriteUtils.createSprite({
                texture: PIXI.Texture.from(this.preset.sprite.texture),
                x: options.spawnPoint.x * Config.PixelsPerMeter,
                y: options.spawnPoint.y * Config.PixelsPerMeter,
                width: this.preset.sprite.widthInMeters * Config.PixelsPerMeter,
                height: this.preset.sprite.heightInMeters * Config.PixelsPerMeter,
                color: this.preset.sprite.color
            });
            
            // Add sprite to proper container
            this.containers.containerForEntity.addChild(this.sprite);
        }

        // If provided, set up and store the body
        if (this.preset.body) {
            this.body = PhysicsUtils.createBody(
                options.levelContext.getPhysicsWorld(), {
                    ...this.preset.body,  
                }
            );

            // Set user data with a self-referencing data
            this.body.setUserData({
                type: this.type,
                entity: this,
                body: this.body
            } as EntityUserData);
        }

        // If provided, set light up and store the light for management
        if (this.preset.light && this.body) {
            this.light = new DynamicLight(
                {...this.body.getPosition()},
                options.levelContext.getEdgesList(),
                { ...this.preset.light! },
            );

            LightManager.instance.addLight(this.light);
        }

        // If provided, set up and store the particle effect for management
        if (this.preset.particleEffect && this.containers.containerForParticleEffects) {
            this.particleEffect = new ParticleEffect({
                ...this.preset.particleEffect,
            });
            this.containers.containerForParticleEffects.addChild(this.particleEffect.container);
            ParticleEffectManager.instance.addEffect(this.particleEffect);
        }
    }

    // @ts-ignore
    update(deltaTime: number) {
        // Update sprite position to match physics body if it exists
        if (this.sprite && this.body) {
            this.sprite.x = this.body.getPosition().x * Config.PixelsPerMeter;
            this.sprite.y = this.body.getPosition().y * Config.PixelsPerMeter;
            this.sprite.rotation = this.body.getAngle();
        }

        // Sync light and particle effects if they exist
        if (this.light) {
            EntityUtils.syncLightToBody(this);
        }
        if (this.particleEffect) {
            EntityUtils.syncEffectToSprite(this);
        }
    }

    destroy() {
        if (this.sprite) {
            // Instantly remove the sprite from the container
            this.containers.containerForEntity.removeChild(this.sprite);
        }

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
        if (this.sprite) {
            // Instantly remove the sprite from the container
            this.containers.containerForEntity.removeChild(this.sprite);
        }

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