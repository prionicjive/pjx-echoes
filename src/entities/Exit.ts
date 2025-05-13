import * as PIXI from 'pixi.js';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { BaseEntity, EntityContainers, EntityUserData } from './BaseEntity';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { LightManager } from '../light/LightManager';

export interface ExitOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Exit extends BaseEntity {
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

        // Construct a static light
        const center = {
            x: options.spawnPoint.x + Config.Exit.width / 2,
            y: options.spawnPoint.y + Config.Exit.height / 2
        };

        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...LightsConfig.ExitLight },
            id
        );

        // Add light to the LightManager
        LightManager.instance.addLight(light);

        super({
            id,
            sprite,
            body,
            light,
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