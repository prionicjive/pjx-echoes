import { Config } from '../config/Config';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { EntityContainers } from './BaseEntity';
import { DynamicEntity } from './DynamicEntity';
import { Segment } from '../utils/types';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { LightsConfig } from '../config/LightsConfig';
import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import * as PIXI from 'pixi.js';
import { EntityUtils } from '../utils/EntityUtils';
import { EntityUserData } from './types';

import { LightOwner } from '../core/Light';

export class Sentry extends DynamicEntity implements LightOwner {
    constructor(
        world: planck.World,
        edgesList: Segment[], 
        spawnPoint: Point,
        containers: EntityContainers, 
        initialVelocity?: planck.Vec2
    ) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Sentry.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.sentry),
            x: spawnPoint.x * Config.PixelsPerMeter,
            y: spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            height: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            color: Config.Sentry.color
        });

        // Create dynamic body
        const body = PhysicsUtils.createBody(world, {
            type: 'dynamic',
            position: new planck.Vec2(spawnPoint.x + Config.Sentry.radius, spawnPoint.y + Config.Sentry.radius),
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
            containers,
            lightOptions: { ...LightsConfig.SentryLight },
            edgesList
        });

        // Set user data with a self-referencing data
        body.setUserData({
            type: Config.Sentry.type,
            entity: this
        } as EntityUserData);

        // Set an initial velocity if provided
        if(initialVelocity) {
            this.body.setLinearVelocity(initialVelocity);
        }
    }

    /**
     * Updates the player's sprite position to match the physics body.
     * Should be called every frame.
     */
    update(deltaTime: number) {
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body.getPosition().x - Config.Sentry.radius) * Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Config.Sentry.radius) * Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();

        // Call the super to update any particle effects, among other things
        super.update(deltaTime);
    }
}
