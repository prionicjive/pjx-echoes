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

export interface AntiOptions {
    world: planck.World, 
    edgesList: Segment[], 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Anti extends StaticEntity {
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
        const body = PhysicsUtils.createBody(options.world, {
            type: 'static',
            position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y),
            box: { width: Config.Anti.width, height: Config.Anti.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryAnti,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        });

        super({
            id,
            sprite,
            body,
            lightOptions: { ...LightsConfig.AntiLight },
            edgesList: options.edgesList,
            position: options.spawnPoint,
            width: Config.Anti.width,
            height: Config.Anti.height,
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