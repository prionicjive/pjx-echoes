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
import { ParticleEffect } from '../particles/ParticleEffect';
import { EntityUtils } from '../utils/EntityUtils';

export interface SwitchOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Switch extends BaseEntity {
    constructor(options: SwitchOptions) {
        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(EntitiesConfig.Switch.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Switch.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Switch.sprite.heightInMeters * Config.PixelsPerMeter,
            color: EntitiesConfig.Switch.sprite.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Switch.body!,
                position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y)
            }
        );

        // Construct a static light
        const center = {
            x: options.spawnPoint.x + Config.Switch.width / 2,
            y: options.spawnPoint.y + Config.Switch.height / 2
        };

        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Switch.light! }
        );

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...EntitiesConfig.Switch.particleEffect!,
        });

        super({
            type: Config.Gate.type as EntityType,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers
        });

        EntityUtils.syncEffectToSprite(this);
    }

    // @ts-ignore
    update(deltaTime: number) {
        // No special update logic... for now
    }
}