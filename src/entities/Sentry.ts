import * as planck from 'planck';
import { Config } from '../config/Config';
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface SentryOptions extends BaseEntityOptions { 
    initialVelocity?: planck.Vec2,
}

export class Sentry extends BaseEntity {
    constructor(options: SentryOptions) {
        const preset = {...EntitiesConfig.Sentry};
        
        // Set the position and initial velocity of the body before passing it on
        if (preset.body) {
            preset.body.position = new planck.Vec2(
                options.spawnPoint.x + Config.Sentry.radius, 
                options.spawnPoint.y + Config.Sentry.radius
            );

            preset.body.initialVelocity = options.initialVelocity;
        }

        super({
            type: Config.Sentry.type as EntityType,
            containers: options.containers,
            levelContext: options.levelContext,
            spawnPoint: options.spawnPoint,
            preset,
        });
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
        
        super.update(deltaTime);
    }
}
