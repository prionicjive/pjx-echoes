import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { DynamicLight } from '../light/Light';
import { ParticleEffect } from '../particles/ParticleEffect';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';

export interface SentryOptions { 
    spawnPoint: Point,
    containers: EntityContainers, 
    initialVelocity?: planck.Vec2,
    levelContext: LevelContext
}

export class Sentry extends BaseEntity {
    constructor(options: SentryOptions) {
        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(EntitiesConfig.Sentry.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Sentry.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Sentry.sprite.heightInMeters * Config.PixelsPerMeter,
            color: EntitiesConfig.Sentry.sprite.color
        });

        // Create dynamic body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Sentry.body!,
                position: new planck.Vec2(options.spawnPoint.x + Config.Sentry.radius, options.spawnPoint.y + Config.Sentry.radius)
            }
        );

        // Create the light
        const light = EntitiesConfig.Sentry.light ? new DynamicLight(
            {...body.getPosition()},
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Sentry.light! },
        ) : undefined;

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...EntitiesConfig.Sentry.particleEffect!,
        });

        super({
            type: Config.Sentry.type as EntityType,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers
        });

        // Set the initial position of the particle effect
        EntityUtils.syncEffectToSprite(this);

        // Set an initial velocity if provided
        if( options.initialVelocity) {
            this.body!.setLinearVelocity(options.initialVelocity);
        }
    }

    /**
     * Updates the player's sprite position to match the physics body.
     * Should be called every frame.
     */
    update(deltaTime: number) {
        // Check to see if the sentry is locked to a certain axis and if so, nudge it away
        const epsilon = 0.01;
        const kick = 1;

        if (Math.abs(this.body!.getLinearVelocity().x) < epsilon) {
            const sign = Math.random() < 0.5 ? -1 : 1;
            this.body!.setLinearVelocity(new planck.Vec2(
                sign * kick,
                this.body!.getLinearVelocity().y
            ));
        }
        if (Math.abs(this.body!.getLinearVelocity().y) < epsilon) {
            const sign = Math.random() < 0.5 ? -1 : 1;
            this.body!.setLinearVelocity(new planck.Vec2(
                this.body!.getLinearVelocity().x,
                sign * kick
            ));
        }
        
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body!.getPosition().x - Config.Sentry.radius) * Config.PixelsPerMeter;
        this.sprite.y = (this.body!.getPosition().y - Config.Sentry.radius) * Config.PixelsPerMeter;
        this.sprite.rotation = this.body!.getAngle();

        EntityUtils.syncLightToBody(this);
        EntityUtils.syncEffectToSprite(this);
    }
}
