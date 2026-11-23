import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface ExitOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext,
    groupId: number
}

export class Exit extends BaseEntity {
    constructor(options: ExitOptions) {
        const preset = EntitiesConfig.Exit;
        const center = Exit.centerOf(options.spawnPoint, preset);
        const sprite = Exit.buildSprite(preset, options.spawnPoint);
        const body = Exit.buildBody(preset, center, options.levelContext.getPhysicsWorld());

        // Construct a static light
        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Exit.light! }
        );

        super({
            type: EntityType.Exit,
            sprite,
            body,
            light,
            containers: options.containers
        });

        body.setUserData({ 
            type: EntityType.Exit, 
            entity: this,
            groupId: options.groupId
        });
    }

}