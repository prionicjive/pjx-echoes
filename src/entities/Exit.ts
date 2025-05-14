import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers, EntityUserData } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';

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
            texture: PIXI.Texture.from(EntitiesConfig.Exit.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Exit.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Exit.sprite.heightInMeters * Config.PixelsPerMeter,
            color: EntitiesConfig.Exit.sprite.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Exit.body!,
                position: new planck.Vec2(options.spawnPoint.x + Config.Exit.width / 2, options.spawnPoint.y + Config.Exit.height / 2)
            }
        );

        // Construct a static light
        const center = {
            x: options.spawnPoint.x + Config.Exit.width / 2,
            y: options.spawnPoint.y + Config.Exit.height / 2
        };

        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Exit.light! },
            id
        );

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
        // No need to update light or particle effect positions... yet? 
    }
}