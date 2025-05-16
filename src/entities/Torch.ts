import * as planck from 'planck';
import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface TorchOptions { 
    levelContext: LevelContext, 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Torch extends BaseEntity {
    constructor(options: TorchOptions) {
        const preset = {...EntitiesConfig.Torch};
                
        // Set the position of the body before passing it on
        if (preset.body) {
            preset.body.position = new planck.Vec2(
                options.spawnPoint.x, 
                options.spawnPoint.y
            );
        }

        super({
            type: Config.Torch.type as EntityType,
            containers: options.containers,
            levelContext: options.levelContext,
            spawnPoint: options.spawnPoint,
            preset,
        });
    }

    update(deltaTime: number) {
        super.update(deltaTime);
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}