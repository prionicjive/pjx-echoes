import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface GateOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext,
    color: number,
    groupId: number
}

export class Gate extends BaseEntity {
    constructor(options: GateOptions) {
        const preset = EntitiesConfig.Gate;
        const center = Gate.centerOf(options.spawnPoint, preset);
        const sprite = Gate.buildSprite(preset, options.spawnPoint, options.color);
        const body = Gate.buildBody(preset, center, options.levelContext.getPhysicsWorld());

        super({
            type: Config.Gate.type as EntityType,
            sprite,
            body,
            containers: options.containers
        });

        // Set user data for the body in a self-referential way
        body.setUserData({ 
            type: Config.Gate.type,
            entity: this,
            groupId: options.groupId
        });
    }

}