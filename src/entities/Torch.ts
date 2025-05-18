import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { ParticleEffect } from '../particles/ParticleEffect';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';

export interface TorchOptions { 
    levelContext: LevelContext, 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Torch extends BaseEntity {
    constructor(options: TorchOptions) {
        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(EntitiesConfig.Torch.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Torch.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Torch.sprite.heightInMeters * Config.PixelsPerMeter,
            color: EntitiesConfig.Torch.sprite.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Torch.body!,
                position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y)
            }
        );

        // Construct a static light
        const center = {
            x: options.spawnPoint.x + Config.Torch.width / 2,
            y: options.spawnPoint.y + Config.Torch.height / 2
        };

        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Torch.light! }
        );

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...EntitiesConfig.Torch.particleEffect!,
        });

        super({
            type: Config.Torch.type as EntityType,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers,
        });

        // Set the initial position of the particle effect
        EntityUtils.syncEffectToSprite(this);
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