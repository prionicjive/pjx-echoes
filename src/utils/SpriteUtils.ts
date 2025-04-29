import { Config } from "../core/Config";
import * as PIXI from 'pixi.js';

interface CreateSpriteOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: number;
    blendMode?: PIXI.BLEND_MODES;
    mask?: PIXI.Graphics;
}

export class SpriteUtils {
    static createSprite(texture: PIXI.Texture, options: CreateSpriteOptions): PIXI.Sprite {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = options.x * Config.PixelsPerMeter;
        sprite.y = options.y * Config.PixelsPerMeter;
        sprite.width = options.width * Config.PixelsPerMeter;
        sprite.height = options.height * Config.PixelsPerMeter;
        if (options.color !== undefined) sprite.tint = options.color;
        if (options.blendMode !== undefined) sprite.blendMode = options.blendMode;
        if (options.mask !== undefined) sprite.mask = options.mask;
        return sprite;
    }    
}
