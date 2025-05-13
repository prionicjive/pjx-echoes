import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { LevelContext } from '../level/LevelContext';
import { DynamicLight } from '../light/Light';
import { ParticleEffect } from '../particles/ParticleEffect';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers, EntityUserData } from './BaseEntity';

export interface SentryOptions { 
    spawnPoint: Point,
    containers: EntityContainers, 
    initialVelocity?: planck.Vec2,
    levelContext: LevelContext
}

export class Sentry extends BaseEntity {
    constructor(options: SentryOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Sentry.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.sentry),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            height: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            color: Config.Sentry.color
        });

        // Create dynamic body
        const body = PhysicsUtils.createBody(options.levelContext.getPhysicsWorld(), {
            type: 'dynamic',
            position: new planck.Vec2(options.spawnPoint.x + Config.Sentry.radius, options.spawnPoint.y + Config.Sentry.radius),
            circle: { radius: Config.Sentry.radius },
            fixture: {
                friction: 0,
                density: 1,
                restitution: 1, // Perfect elasticity
                filterCategoryBits: Config.Physics.Collision.categorySentry,
                filterMaskBits: Config.Physics.Collision.categoryEdge
                    | Config.Physics.Collision.categoryPlayer
                    | Config.Physics.Collision.categoryWall
                    | Config.Physics.Collision.categorySentry
            }
        });

        // Create the light
        const light = new DynamicLight(
            {...body.getPosition()},
            options.levelContext.getEdgesList(),
            { ...LightsConfig.SentryLight },
            id,
        );

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...ParticleEffectsConfig.SentryTrail,
        });
        particleEffect.setPosition(
            sprite.x + sprite.width / 2,
            sprite.y + sprite.height / 2
        );

        super({
            id,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers
        });

        // Set user data with a self-referencing data
        body.setUserData({
            type: Config.Sentry.type,
            entity: this
        } as EntityUserData);

        // Set an initial velocity if provided
        if( options.initialVelocity) {
            this.body.setLinearVelocity(options.initialVelocity);
        }
    }

    /**
     * Updates the player's sprite position to match the physics body.
     * Should be called every frame.
     */
    // @ts-ignore
    update(deltaTime: number) {
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body.getPosition().x - Config.Sentry.radius) * Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Config.Sentry.radius) * Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();

        EntityUtils.syncLightToBody(this);
        EntityUtils.syncEffectToSprite(this);
    }
}
