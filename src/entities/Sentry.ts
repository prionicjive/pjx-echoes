import { Config } from '../core/Config';
import { Entity, EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { Point } from '../utils/types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { EntityFactory } from './EntityFactory';
import { DynamicEntity } from './DynamicEntity';
import { Segment } from '../utils/types';

export class Sentry extends DynamicEntity implements Entity {
    constructor(world: planck.World, edgesList: Segment[], container: PIXI.Container, spawnPoint: Point, initialVelocity?: planck.Vec2) {
        const entity = EntityFactory.create({
            type: Config.Sentry.type as EntityType,
            id: EntityUtils.generateRandomId(Config.Sentry.type),
            x: spawnPoint.x,
            y: spawnPoint.y,
            radius: Config.Sentry.radius,
            color: Config.Sentry.color,
        }, world);

        // TODO Pass a ParticleEmitterOptions object
        super({
            id: entity.id,
            sprite: entity.sprite,
            body: entity.body!,
            lightOptions: Config.SentryLight,
            edgesList       
        });

        // Set an initial velocity if provided
        if(initialVelocity) {
            this.body.setLinearVelocity(initialVelocity);
        }

        container.addChild(this.sprite);
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
