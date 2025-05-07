import { Config } from '../core/Config';
import { Entity, EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { EntityFactory } from './EntityFactory';
import { DynamicEntity, DynamicEntityContainers } from './DynamicEntity';
import { Segment } from '../utils/types';
import { ParticleEffectOptions } from '../particles/ParticleEffect';
import { Color } from 'pixi.js';

// TODO Make ParticleEffectOptions more configurable rather than
// have it defined here.
const particleEffectOptions: ParticleEffectOptions = {
    texturePath: Config.Textures.Particles.circleSoft,
    emitPerSecond: 10,
    maxParticles: 100,
    particleOptions: {
        maxLife: 2,
        startAlpha: 1,
        endAlpha: 0,
        startScaleX: 1,
        startScaleY: 1,
        endScaleX: 0.42,
        endScaleY: 0.42,
        width: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
        height: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
        startTint: new Color(Config.Sentry.color),
        endTint: new Color(0x0000ff), // TODO Just for test, should be configurable
        startDirection: {x: 0, y: 0},
        endDirection: {x: 0, y: 0},
        startSpeed: 0,
        endSpeed: 0
    }
};

export class Sentry extends DynamicEntity implements Entity {
    constructor(
        world: planck.World,
        edgesList: Segment[], 
        spawnPoint: Point,
        containers: DynamicEntityContainers, 
        initialVelocity?: planck.Vec2
    ) {
        const entity = EntityFactory.create({
            type: Config.Sentry.type as EntityType,
            id: EntityUtils.generateRandomId(Config.Sentry.type),
            x: spawnPoint.x,
            y: spawnPoint.y,
            radius: Config.Sentry.radius,
            color: Config.Sentry.color,
        }, world);

        super({
            id: entity.id,
            sprite: entity.sprite,
            body: entity.body!,
            particleEffectOptions,
            particleContainer: containers.containerForParticles,
            lightOptions: Config.SentryLight,
            edgesList
        });

        // Set an initial velocity if provided
        if(initialVelocity) {
            this.body.setLinearVelocity(initialVelocity);
        }

        containers.containerForEntity.addChild(this.sprite);
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
