import { Config } from "../config/Config";
import { Point } from "../utils/types";

import * as PIXI from 'pixi.js';

interface CreateSpriteOptions {
    texture: PIXI.Texture;
    x: number;
    y: number;
    width: number;
    height: number;
    anchor?: Point;
    color?: number;
    blendMode?: PIXI.BLEND_MODES;
    mask?: PIXI.Graphics;
}

export class SpriteUtils {
    static createSprite(options: CreateSpriteOptions): PIXI.Sprite {
        const sprite = new PIXI.Sprite(options.texture);
        sprite.x = options.x;
        sprite.y = options.y;
        sprite.width = options.width;
        sprite.height = options.height;
        if (options.anchor !== undefined) sprite.anchor.set(options.anchor.x, options.anchor.y);
        if (options.color !== undefined) sprite.tint = options.color;
        if (options.blendMode !== undefined) sprite.blendMode = options.blendMode;
        if (options.mask !== undefined) sprite.mask = options.mask;
        return sprite;
    }    
}
