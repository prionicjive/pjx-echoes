import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface AntiOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Anti extends BaseEntity {
    constructor(options: AntiOptions) {
        const preset = EntitiesConfig.Anti;
        const center = Anti.centerOf(options.spawnPoint, preset);
        const sprite = Anti.buildSprite(preset, options.spawnPoint);
        const body = Anti.buildBody(preset, center, options.levelContext.getPhysicsWorld());

        // Construct a static light
        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Anti.light! }
        );

        super({
            type: Config.Anti.type as EntityType,
            sprite,
            body,
            light,
            containers: options.containers
        });
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}