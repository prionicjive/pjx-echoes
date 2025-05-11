import * as PIXI from 'pixi.js';
import { StaticEntity } from './StaticEntity';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { EntityContainers } from './BaseEntity';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { EntityUserData } from './types';
import { LevelContext } from '../level/LevelContext';

export interface ExitOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Exit extends StaticEntity {
    constructor(options: ExitOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Exit.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.exit),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Exit.width * Config.PixelsPerMeter,
            height: Config.Exit.height * Config.PixelsPerMeter,
            color: Config.Exit.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(options.levelContext.getPhysicsWorld(), {
            type: 'static',
            position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y),
            box: { width: Config.Exit.width, height: Config.Exit.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryExit,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        });

        super({
            id,
            sprite,
            body,
            lightOptions: { ...LightsConfig.ExitLight },
            levelContext: options.levelContext,
            position: options.spawnPoint,
            width: Config.Exit.width,
            height: Config.Exit.height,
            containers: options.containers
        });

        // Set user data with a self-referencing data
        body.setUserData({
            type: Config.Exit.type,
            entity: this
        } as EntityUserData);
    }

    // @ts-ignore
    update(deltaTime: number) {
        // TODO Do any custom updating
    }
}