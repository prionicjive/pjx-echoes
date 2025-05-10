import * as PIXI from 'pixi.js';
import { StaticEntity } from './StaticEntity';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { Segment } from '../utils/types';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { EntityContainers } from './BaseEntity';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { EntityUserData } from './types';

export interface FinishAreaOptions {
    world: planck.World, 
    edgesList: Segment[], 
    spawnPoint: Point,
    containers: EntityContainers
}

export class FinishArea extends StaticEntity {
    constructor(options: FinishAreaOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.FinishArea.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.finishArea),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.FinishArea.width * Config.PixelsPerMeter,
            height: Config.FinishArea.height * Config.PixelsPerMeter,
            color: Config.FinishArea.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(options.world, {
            type: 'static',
            position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y),
            box: { width: Config.FinishArea.width, height: Config.FinishArea.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryFinishArea,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        });

        super({
            id,
            sprite,
            body,
            lightOptions: { ...LightsConfig.FinishAreaLight },
            edgesList: options.edgesList,
            position: options.spawnPoint,
            width: Config.FinishArea.width,
            height: Config.FinishArea.height,
            containers: options.containers
        });

        // Set user data with a self-referencing data
        body.setUserData({
            type: Config.FinishArea.type,
            entity: this
        } as EntityUserData);
    }

    // @ts-ignore
    update(deltaTime: number) {
        // TODO Do any custom updating
    }
}