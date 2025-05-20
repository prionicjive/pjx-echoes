import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface GateOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext,
    color: number
}

export class Gate extends BaseEntity {
    constructor(options: GateOptions) {
        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(EntitiesConfig.Gate.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Gate.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Gate.sprite.heightInMeters * Config.PixelsPerMeter,
            color: options.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Gate.body!,
                position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y)
            }
        );

        super({
            type: Config.Gate.type as EntityType,
            sprite,
            body,
            containers: options.containers
        });
    }

    // @ts-ignore
    update(deltaTime: number) {
        // No special update logic... for now
    }
}