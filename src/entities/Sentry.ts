import { Config } from '../config/Config';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { EntityContainers } from './BaseEntity';
import { DynamicEntity } from './DynamicEntity';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { LightsConfig } from '../config/LightsConfig';
import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import * as PIXI from 'pixi.js';
import { EntityUtils } from '../utils/EntityUtils';
import { EntityUserData } from './types';
import { LightOwner } from '../light/Light';
import { LevelContext } from '../level/LevelContext';

export interface SentryOptions {
    world: planck.World, 
    spawnPoint: Point,
    containers: EntityContainers, 
    initialVelocity?: planck.Vec2,
    levelContext: LevelContext
}

export class Sentry extends DynamicEntity implements LightOwner {
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
        const body = PhysicsUtils.createBody(options.world, {
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

        super({
            id,
            sprite,
            body,
            particleEffectOptions: { ...ParticleEffectsConfig.SentryTrail },
            containers: options.containers,
            lightOptions: { ...LightsConfig.SentryLight },
            levelContext: options.levelContext
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

        // Set the initial position of the particle effect
        this.particleEffect?.setEffectPosition(
            this.sprite.x + this.sprite.width / 2,
            this.sprite.y + this.sprite.height / 2
        );
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

        // Update the particle effect position
        this.particleEffect?.setEffectPosition(
            this.sprite.x + this.sprite.width / 2,
            this.sprite.y + this.sprite.height / 2
        );
    }
}
