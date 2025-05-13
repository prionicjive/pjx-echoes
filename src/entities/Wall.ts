import * as PIXI from 'pixi.js';
import { Config } from '../config/Config';
import { EntityUtils } from '../utils/EntityUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { Point } from '../utils/types';

export interface WallOptions { 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Wall extends BaseEntity {
    constructor(options: WallOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Wall.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.block),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Wall.width * Config.PixelsPerMeter,
            height: Config.Wall.height * Config.PixelsPerMeter,
            color: Config.Wall.color
        });

        super({
            id,
            sprite, 
            containers: options.containers,
        });
    }

    // @ts-ignore
    update(deltaTime: number) {
        // TODO Do any custom updating
    }
}