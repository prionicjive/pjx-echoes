import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Light } from '../light/Light';
import { LightManager } from '../light/LightManager';
import { ParticleEffect } from '../particles/ParticleEffect';
import { ParticleEffectManager } from '../particles/ParticleEffectManager';
import { EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsManager } from '../physics/PhysicsManager';
import { EntityPreset } from '../config/EntitiesConfig';
import { Config } from '../config/Config';
import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Point } from '../utils/types';

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
    groupId?: number;
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_deltaTime: number): void {}

    // ---------------------------------------------------------------------------
    // Construction helpers — call these from subclass constructors
    // ---------------------------------------------------------------------------

    /** Builds a sprite from the preset dimensions/texture, with an optional color override. */
    protected static buildSprite(preset: EntityPreset, spawnPoint: Point, colorOverride?: number): PIXI.Sprite {
        return SpriteUtils.createSprite({
            texture: PIXI.Texture.from(preset.sprite.texture),
            x: spawnPoint.x * Config.PixelsPerMeter,
            y: spawnPoint.y * Config.PixelsPerMeter,
            width: preset.sprite.widthInMeters * Config.PixelsPerMeter,
            height: preset.sprite.heightInMeters * Config.PixelsPerMeter,
            color: colorOverride ?? preset.sprite.color
        });
    }

    /** Returns the center of the entity tile in world-space meters. */
    protected static centerOf(spawnPoint: Point, preset: EntityPreset): Point {
        return {
            x: spawnPoint.x + preset.sprite.widthInMeters / 2,
            y: spawnPoint.y + preset.sprite.heightInMeters / 2
        };
    }

    /** Creates a physics body from the preset, placed at the given center position. */
    protected static buildBody(preset: EntityPreset, center: Point, physicsWorld: planck.World): planck.Body {
        return PhysicsUtils.createBody(physicsWorld, {
            ...preset.body!,
            position: new planck.Vec2(center.x, center.y)
        });
    }

    destroy(physicsManager: PhysicsManager) {
        this.destroyInternal(physicsManager, false);
    }

    gentlyDestroy(physicsManager: PhysicsManager) {
        this.destroyInternal(physicsManager, true);
    }

    private destroyInternal(physicsManager: PhysicsManager, gentle: boolean) {
        this.containers.containerForEntity.removeChild(this.sprite);

        if (this.body && this.body.getWorld()) {
            if (physicsManager) {
                physicsManager.destroyBody(this.body);
            } else {
                this.body.getWorld().destroyBody(this.body);
            }
        }

        if (this.light) {
            gentle
                ? LightManager.instance.gentlyRemoveLight(this.light)
                : LightManager.instance.removeLight(this.light);
        }

        if (this.particleEffect) {
            gentle
                ? ParticleEffectManager.instance.gentlyRemoveEffect(this.particleEffect)
                : ParticleEffectManager.instance.removeEffect(this.particleEffect);
        }
    }
}