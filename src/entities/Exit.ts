import * as planck from 'planck';
import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface ExitOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Exit extends BaseEntity {
    constructor(options: ExitOptions) {
        const preset = {...EntitiesConfig.Exit};
                        
        // Set the position of the body before passing it on
        if (preset.body) {
            preset.body.position = new planck.Vec2(
                options.spawnPoint.x, 
                options.spawnPoint.y
            );
        }

        super({
            type: Config.Exit.type as EntityType,
            containers: options.containers,
            levelContext: options.levelContext,
            spawnPoint: options.spawnPoint,
            preset,
        });
    }

    update(deltaTime: number) {
        super.update(deltaTime);
    }
}