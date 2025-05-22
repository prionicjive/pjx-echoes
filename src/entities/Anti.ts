import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';

export interface AntiOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Anti extends BaseEntity {
    constructor(options: AntiOptions) {
        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(EntitiesConfig.Anti.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Anti.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Anti.sprite.heightInMeters * Config.PixelsPerMeter,
            color: EntitiesConfig.Anti.sprite.color
        });

        const center = {
            x: options.spawnPoint.x + Config.Anti.width / 2,
            y: options.spawnPoint.y + Config.Anti.height / 2
        };
        
        // Create static body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Anti.body!,
                position: new planck.Vec2(center.x, center.y)
            }
        );

        // Construct a static light
        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Anti.light! }
        );

        super({
            type: Config.Anti.type as EntityType,
            sprite,
            body,
            light,
            containers: options.containers
        });
    }

    // @ts-ignore
    update(deltaTime: number) {
        // No special update logic... for now
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}