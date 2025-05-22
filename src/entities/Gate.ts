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
    color: number,
    groupId: number
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

        const center = {
            x: options.spawnPoint.x + Config.Gate.width / 2,
            y: options.spawnPoint.y + Config.Gate.height / 2
        };

        // Create static body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Gate.body!,
                position: new planck.Vec2(center.x, center.y)
            }
        );

        super({
            type: Config.Gate.type as EntityType,
            sprite,
            body,
            containers: options.containers
        });

        // Set user data for the body in a self-referential way
        body.setUserData({ 
            type: Config.Gate.type,
            entity: this,
            groupId: options.groupId
        });
    }

    // @ts-ignore
    update(deltaTime: number) {
        // No special update logic... for now
    }
}