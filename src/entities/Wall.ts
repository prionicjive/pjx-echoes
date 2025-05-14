import * as PIXI from 'pixi.js';
import { Config } from '../config/Config';
import { EntityUtils } from '../utils/EntityUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';

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
            texture: PIXI.Texture.from(EntitiesConfig.Wall.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Wall.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Wall.sprite.heightInMeters * Config.PixelsPerMeter,
            color: EntitiesConfig.Wall.sprite.color
        });

        super({
            id,
            sprite, 
            containers: options.containers,
        });
    }

    // @ts-ignore
    update(deltaTime: number) {
        // No need to update light or particle effect positions... yet? 
    }
}