import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { ParticleEffect } from '../particles/ParticleEffect';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';

export interface TorchOptions { 
    levelContext: LevelContext, 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Torch extends BaseEntity {
    constructor(options: TorchOptions) {
        const preset = EntitiesConfig.Torch;
        const center = Torch.centerOf(options.spawnPoint, preset);
        const sprite = Torch.buildSprite(preset, options.spawnPoint);
        const body = Torch.buildBody(preset, center, options.levelContext.getPhysicsWorld());

        // Construct a static light
        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Torch.light! }
        );

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...EntitiesConfig.Torch.particleEffect!,
        });

        super({
            type: Config.Torch.type as EntityType,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers,
        });

        // Set the initial position of the particle effect
        EntityUtils.syncEffectToSprite(this);

        // Play the effect
        this.particleEffect!.play();
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}