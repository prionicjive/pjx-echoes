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

export interface FinishOptions {
    world: planck.World, 
    edgesList: Segment[], 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Finish extends StaticEntity {
    constructor(options: FinishOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Finish.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.finish),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Finish.width * Config.PixelsPerMeter,
            height: Config.Finish.height * Config.PixelsPerMeter,
            color: Config.Finish.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(options.world, {
            type: 'static',
            position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y),
            box: { width: Config.Finish.width, height: Config.Finish.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryFinish,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        });

        // Set user data with a self-referencing body
        body.setUserData({
            type: Config.Finish.type,
            id,
            sprite,
            body
        });

        super({
            id,
            sprite,
            body,
            lightOptions: { ...LightsConfig.FinishLight },
            edgesList: options.edgesList,
            position: options.spawnPoint,
            width: Config.Finish.width,
            height: Config.Finish.height,
        });

        // Add the sprite to the main entity container
        options.containers.containerForEntity.addChild(this.sprite);
    }

    update(deltaTime: number) {
        // TODO Do any custom updating
        
        // Call the super to update any particle effects, among other things
        super.update(deltaTime);
    }
}