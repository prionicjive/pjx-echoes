import { Config } from '../config/Config';
import { Entity, EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { EntityFactory } from './EntityFactory';
import { DynamicEntity, DynamicEntityContainers } from './DynamicEntity';
import { Segment } from '../utils/types';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { LightsConfig } from '../config/LightsConfig';

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
            particleEffectOptions: {...ParticleEffectsConfig.SentryTrail},
            particleContainer: containers.containerForParticles,
            lightOptions: {...LightsConfig.SentryLight},
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
