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

export interface AntiOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Anti extends BaseEntity {
    constructor(options: AntiOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Anti.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.anti),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Anti.width * Config.PixelsPerMeter,
            height: Config.Anti.height * Config.PixelsPerMeter,
            color: Config.Anti.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(options.levelContext.getPhysicsWorld(), {
            type: 'static',
            position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y),
            box: { width: Config.Anti.width, height: Config.Anti.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryAnti,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        });

        // Construct a static light
        const center = {
            x: options.spawnPoint.x + Config.Anti.width / 2,
            y: options.spawnPoint.y + Config.Anti.height / 2
        };

        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...LightsConfig.AntiLight },
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
            type: Config.Anti.type,
            entity: this
        } as EntityUserData);
    }

    // @ts-ignore
    update(deltaTime: number) {
        // TODO Do any custom updating
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}